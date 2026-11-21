import { expect, test } from "bun:test";
import { parseScannedSku } from "./sku";

test("returns the SKU from a pasted barcode ending in a question mark", () => {
    expect(parseScannedSku("041234561680?")).toBe("041234561680");
});
