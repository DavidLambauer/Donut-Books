import { parseCompactOption } from "./compact-number.js";

export function resolvePricingOptions(options, quantity) {
  const totalResult = parseCompactOption(options, "total", "Total");
  const pricePerItemResult = parseCompactOption(options, "price_per_item", "Price per item");

  if (totalResult.error) {
    return { error: totalResult.error };
  }

  if (pricePerItemResult.error) {
    return { error: pricePerItemResult.error };
  }

  const hasTotal = !totalResult.missing;
  const hasPricePerItem = !pricePerItemResult.missing;

  if (hasTotal === hasPricePerItem) {
    return {
      error: "Provide exactly one of Total or Price per item.",
    };
  }

  if (hasTotal) {
    return {
      totalAmount: totalResult.value,
      pricePerItem: totalResult.value / quantity,
    };
  }

  return {
    totalAmount: pricePerItemResult.value * quantity,
    pricePerItem: pricePerItemResult.value,
  };
}