import type { CSSProperties, FC } from "hono/jsx";

type LayoutProps = {
    title: string;
    children: unknown;
};

export const actionStyle = { textAlign: "right" } as const;

export const Layout: FC<LayoutProps> = ({ title, children }) => {
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

                <link
                    href="https://fonts.googleapis.com/css2?family=Libre+Barcode+EAN13+Text&display=swap"
                    rel="stylesheet"
                />
            </head>

            <body>
                <header>
                    <h1>Ecco Qua</h1>
                </header>

                <main>{children}</main>
            </body>
        </html>
    );
};

type BarcodeProps = {
    code: string;
}
const barcodeStyle: CSSProperties = {
    fontFamily: '"Libre Barcode EAN13 Text", system-ui, sans-serif',
    fontSize: "192px",
    lineHeight: 1,
    letterSpacing: 0,
    whiteSpace: "nowrap",
    fontFeatureSettings: '"cv01"',
};
export const Barcode: FC<BarcodeProps> = ({ code }) => {
    return <div style={barcodeStyle}>{code}</div>;
};
