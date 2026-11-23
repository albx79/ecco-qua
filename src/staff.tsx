import { decode, encode } from "@auth/core/jwt";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sql } from "./db";
import { Layout } from "./layout";

export type StaffEnv = { Variables: { staffSessionExpiresAt: number } };
const sessionCookie = "staff_session";
const sessionSeconds = 30 * 60;
const dummyPasswordHash = "$argon2id$v=19$m=65536,t=2,p=1$HM8xAJylkoCUwHFC6x2goujubtNl2cHkoQfKCioAQDA$/fNPEpTGfqaAku8IX2ekAjqR+wJ4uaQ+9vML6suHl8c";

function authSecret() {
    const secret = process.env.AUTH_SECRET;
    return secret && secret.length >= 32 ? secret : undefined;
}

async function readStaffSession(c: Context) {
    const secret = authSecret();
    const token = getCookie(c, sessionCookie);
    if (!secret || !token) return undefined;

    try {
        const claims = await decode({ token, secret, salt: sessionCookie });
        if (!claims || typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now() ||
            !Array.isArray(claims.shopIds) || !claims.shopIds.every((id) => typeof id === "string")) {
            return undefined;
        }
        return { expiresAt: claims.exp * 1000, shopIds: claims.shopIds as string[] };
    } catch {
        return undefined;
    }
}

function cookieOptions(c: Context) {
    const url = new URL(c.req.url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return { path: "/", httpOnly: true, sameSite: "Strict" as const, secure: url.protocol === "https:" || !local };
}

export const protectStaffRequests = createMiddleware(async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (c.req.method === "POST") {
        const origin = c.req.header("Origin");
        const fetchSite = c.req.header("Sec-Fetch-Site");
        if (fetchSite ? fetchSite !== "same-origin" : origin !== new URL(c.req.url).origin) {
            return c.text("Richiesta non valida", 403);
        }
    }
    await next();
});

export const requireShopStaff = createMiddleware<StaffEnv>(async (c, next) => {
    const session = await readStaffSession(c);
    if (!session) {
        if (c.req.method === "GET" && c.req.header("Datastar-Request") !== "true" &&
            !c.req.header("Accept")?.includes("text/event-stream")) {
            return c.redirect("/staff/login");
        }
        return c.text("Accesso richiesto", 401);
    }

    const shopId = c.req.param("shopId");
    if (!shopId || !session.shopIds.includes(shopId.toLowerCase())) return c.notFound();
    c.set("staffSessionExpiresAt", session.expiresAt);
    await next();
});

function Login({ invalid = false }: { invalid?: boolean }) {
    return (
        <Layout title="Accesso negozi">
            <h2>Accesso negozi</h2>
            {invalid && <p role="alert">Email o password non valida.</p>}
            <form method="post" action="/staff/login">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autocomplete="username" maxlength={254} required />
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" maxlength={1024} required />
                <button type="submit">Accedi</button>
            </form>
        </Layout>
    );
}

export const staffRoutes = new Hono();
staffRoutes.use("*", protectStaffRequests);

staffRoutes.get("/login", async (c) => {
    if (await readStaffSession(c)) return c.redirect("/staff");
    return c.html(<Login />);
});

staffRoutes.post("/login", async (c) => {
    const secret = authSecret();
    if (!secret) return c.text("Accesso negozi non configurato", 503);

    const form = await c.req.parseBody();
    const email = typeof form.email === "string" ? form.email.trim().toLowerCase() : "";
    const password = form.password;
    if (!email || email.length > 254 || typeof password !== "string" || !password || password.length > 1024) {
        return c.html(<Login invalid />, 401);
    }

    const [staff] = await sql<{ id: string; passwordHash: string }[]>`
        select id, password_hash as "passwordHash" from staff_users where email = ${email}
    `;
    const matches = await Bun.password.verify(password, staff?.passwordHash ?? dummyPasswordHash);
    if (!staff || !matches) return c.html(<Login invalid />, 401);

    const shops = await sql<{ id: string }[]>`
        select shops.id from shops
        join shop_staff on shop_staff.shop_id = shops.id
        where shop_staff.staff_id = ${staff.id}::uuid and shops.status = 'active'
    `;
    const token = await encode({
        token: { sub: staff.id, shopIds: shops.map((shop) => shop.id) },
        secret,
        salt: sessionCookie,
        maxAge: sessionSeconds,
    });
    setCookie(c, sessionCookie, token, { ...cookieOptions(c), maxAge: sessionSeconds });
    return c.redirect("/staff", 303);
});

staffRoutes.get("/", async (c) => {
    const session = await readStaffSession(c);
    if (!session) return c.redirect("/staff/login");
    const shops = await sql<{ id: string; name: string }[]>`
        select shops.id, shops.name from shops
        where id = any(${session.shopIds}::uuid[]) and status = 'active'
        order by shops.name
    `;
    return c.html(
        <Layout title="Negozi">
            <h2>I tuoi negozi</h2>
            {shops.length === 0 ? <p>Nessun negozio assegnato.</p> : (
                <ul>{shops.map((shop) => <li><a href={`/shop/${shop.id}/deliveries`}>{shop.name}</a></li>)}</ul>
            )}
            <form method="post" action="/staff/logout"><button type="submit">Esci</button></form>
        </Layout>,
    );
});

staffRoutes.post("/logout", (c) => {
    deleteCookie(c, sessionCookie, cookieOptions(c));
    return c.redirect("/staff/login", 303);
});
