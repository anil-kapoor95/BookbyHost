/**
 * Prices shown like the back office shows them (System options > Price format and currency
 * position; pjCurrency::formatPrice). The formats and signs come from the API.
 */
export interface PriceFormat {
  /** 1: 1000, 2: 1000.00, 3: 1,000, 4: 1,000.00, 5: 1 000, 6: 1 000.00 */
  price_format: number;
  currency_place: "front" | "back";
}

export const DEFAULT_PRICE_FORMAT: PriceFormat = { price_format: 4, currency_place: "back" };

/**
 * Decimal places of a currency (ISO 4217 minor units, e.g. 2 for EUR/USD/INR/GBP, 0 for JPY, 3 for KWD), from the
 * browser's Intl data; 2 when the code is unknown. Formats with decimals (2, 4, 6) use it.
 */
export function currencyDecimals(currency?: string): number {
  if (!currency) return 2;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/**
 * Currency symbol from Intl data (€, $, ₹, £ …), for pages that have no symbol from the API (sample data).
 * Pages fed by the API use its currency_sign (the back office's currency table) instead.
 */
export function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value || currency;
  } catch {
    return currency;
  }
}

export function formatNumberLike(amount: number, format: number, currencyDigits = 2): string {
  const decimals = format % 2 === 0 ? currencyDigits : 0;
  const thousands = format <= 2 ? "" : format <= 4 ? "," : " ";
  const [whole, fraction] = Math.abs(amount).toFixed(decimals).split(".");
  const grouped = thousands ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) : whole;
  return `${amount < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** "8,500.00 $" / "$ 8,500.00" … as the back office formats it. */
export function formatAdminPrice(amount: number, sign: string, format: PriceFormat = DEFAULT_PRICE_FORMAT, currency?: string): string {
  const number = formatNumberLike(amount, format.price_format, currencyDecimals(currency));
  return format.currency_place === "front" ? `${sign} ${number}` : `${number} ${sign}`;
}
