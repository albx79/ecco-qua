import type { FC } from "hono/jsx";
import { actionStyle } from "./layout";
import {
    DeliveryStatus,
    isDeliveryStatus,
    skuDigits,
    statusTransitions,
} from "./deliveries";

export const statusLabels: Record<DeliveryStatus, string> = {
    created: "Creato",
    paid: "Pagato",
    shipped: "Spedito",
    delivered: "Consegnato",
    cancelled: "Annullato",
};

const transitionLabels: Record<DeliveryStatus, string> = {
    created: "",
    paid: "Segna come pagato",
    shipped: "Segna come spedito",
    delivered: "Segna come consegnato",
    cancelled: "Annulla",
};

export const formatDate = (d: Date) =>
    d.toLocaleString("it-IT", {
        timeZone: "Europe/Rome",
        dateStyle: "short",
        timeStyle: "short",
    });

const statusLabel = (status: string) =>
    isDeliveryStatus(status) ? statusLabels[status] : status;

// The components below each have a fixed id: they are rendered into the page
// and then re-sent over SSE, and Datastar morphs them in by that id.

type DeliveriesTableProps = {
    shopId: string;
    deliveries: {
        id: string;
        createdAt: Date;
        status: string;
        recipientName: string;
        city: string;
        sku: string | null;
    }[];
};

export const DeliveriesTable: FC<DeliveriesTableProps> = ({ shopId, deliveries }) => (
    <div id="deliveries">
        {deliveries.length === 0 ? (
            <p>Nessun ordine.</p>
        ) : (
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Nome</th>
                        <th>Città</th>
                        <th>Codice</th>
                        <th>Stato</th>
                    </tr>
                </thead>
                <tbody>
                    {deliveries.map((d) => (
                        <tr id={d.id}>
                            <td>{formatDate(d.createdAt)}</td>
                            <td>
                                <a href={`/shop/${shopId}/deliveries/${d.id}`}>
                                    {d.recipientName}
                                </a>
                            </td>
                            <td>{d.city}</td>
                            <td>{d.sku && skuDigits(d.sku)}</td>
                            <td>{statusLabel(d.status)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);

type ShopDeliveryStatusProps = {
    shopId: string;
    delivery: { id: string; status: DeliveryStatus };
};

export const ShopDeliveryStatus: FC<ShopDeliveryStatusProps> = ({ shopId, delivery }) => (
    <div id="delivery-status">
        <p>
            Stato: <strong>{statusLabels[delivery.status]}</strong>
        </p>
        <div style={actionStyle}>
            {statusTransitions[delivery.status].map((to) => (
                <button
                    type="button"
                    data-on:click={`@post('/shop/${shopId}/deliveries/${delivery.id}/status/${to}')`}
                >
                    {transitionLabels[to]}
                </button>
            ))}
        </div>
    </div>
);

export const CustomerDeliveryStatus: FC<{ status: string }> = ({ status }) => (
    <p id="status">
        Stato: <strong>{statusLabel(status)}</strong>
    </p>
);
