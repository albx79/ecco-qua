import type { FC } from "hono/jsx";

type LayoutProps = {
  title: string;
  children: unknown;
};

export const Layout: FC<LayoutProps> = ({
  title,
  children,
}) => {
  return (
    <html lang="it">
      <head>
        <meta charSet="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>{title}</title>

        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css"
        />
      </head>

      <body>
        <header>
          <h1>Ecco Qua</h1>
        </header>

        <main>
          {children}
        </main>
      </body>
    </html>
  );
};