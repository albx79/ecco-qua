import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/src/web/serverSentEventGenerator.js";
import { sql } from "./db";

export type DeliveryChange = { deliveryId: string; shopId: string };

const listeners = new Set<(change: DeliveryChange) => void>();

// One LISTEN connection for the whole server, fanned out in-process to the
// open streams. postgres.js reconnects and re-listens on its own.
sql.listen("delivery_changed", (payload) => {
    const change = JSON.parse(payload) as DeliveryChange;
    for (const listener of listeners) {
        listener(change);
    }
}).catch((err: unknown) => console.error("LISTEN delivery_changed failed", err));

/**
 * An SSE response that sends `render()` straight away, then again every time
 * a delivery change matching `matches` is committed, until the client goes
 * away. Datastar morphs the patch into the element with the same id.
 */
export function liveDeliveries(
    matches: (change: DeliveryChange) => boolean,
    render: () => Promise<string>,
    expiresAt?: number,
): Response {
    let unsubscribe = () => {};

    return ServerSentEventGenerator.stream(
        async (stream) => {
            // Renders run one at a time so patches can't arrive out of order.
            let queue = Promise.resolve();
            let closed = false;
            const close = () => {
                if (closed) return;
                unsubscribe();
                stream.close();
            };
            const expired = () => expiresAt !== undefined && Date.now() >= expiresAt;
            const push = () => {
                queue = queue
                    .then(async () => {
                        if (closed) return;
                        if (expired()) return close();
                        const html = await render();
                        if (expired()) return close();
                        if (!closed) stream.patchElements(html);
                    })
                    .catch((err: unknown) => console.error("live render failed", err));
            };

            const listener = (change: DeliveryChange) => {
                if (matches(change)) {
                    push();
                }
            };
            listeners.add(listener);
            const expiryTimer = expiresAt === undefined ? undefined : setTimeout(close, expiresAt - Date.now());
            unsubscribe = () => {
                closed = true;
                clearTimeout(expiryTimer);
                listeners.delete(listener);
            };

            push();
            await queue;
        },
        { keepalive: true, onAbort: () => unsubscribe() },
    );
}
