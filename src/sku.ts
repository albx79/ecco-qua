// Scanned barcodes append a check digit, which can appear as "?" when pasted.
export function parseScannedSku(input: string): string | undefined {
    const digits = input.replace(/\s/g, "");
    if (!/^\d{12}.?$/.test(digits)) {
        return undefined;
    }
    return digits.slice(0, 12);
}
