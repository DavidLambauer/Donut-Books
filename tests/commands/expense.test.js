import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "test-uuid" },
        error: null,
      }),
    }),
  });
  return {
    default: {
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    },
  };
});

import { handleExpense } from "../../src/commands/expense.js";

function makeInteraction(item, quantity, pricingOptions) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "item", value: item },
        { name: "quantity", value: quantity },
        ...pricingOptions,
      ],
    },
  };
}

describe("handleExpense", () => {
  it("logs_an_expense_from_total_and_returns_embed", async () => {
    const interaction = makeInteraction("Bone Blocks", 300000, [
      { name: "total", value: "10m" },
    ]);
    const result = await handleExpense(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Expense Logged");
    expect(embed.fields).toContainEqual({ name: "Item", value: "Bone Blocks", inline: true });
    expect(embed.fields).toContainEqual({ name: "Quantity", value: "300,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total", value: "$10,000,000", inline: true });
    expect(embed.footer.text).toContain("TestUser");
  });

  it("shows_per_unit_price", async () => {
    const interaction = makeInteraction("Blaze Rods", 500, [
      { name: "total", value: "75k" },
    ]);
    const result = await handleExpense(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$150", inline: true });
  });

  it("logs_an_expense_from_price_per_item", async () => {
    const interaction = makeInteraction("Blaze Rods", 500, [
      { name: "price_per_item", value: "150" },
    ]);
    const result = await handleExpense(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Total", value: "$75,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$150", inline: true });
  });

  it("rejects_missing_or_duplicate_pricing_inputs", async () => {
    const missingPricingInteraction = makeInteraction("Bone Blocks", 300000, []);
    const duplicatePricingInteraction = makeInteraction("Bone Blocks", 300000, [
      { name: "total", value: "10m" },
      { name: "price_per_item", value: "33.3333" },
    ]);

    const missingPricingResult = await handleExpense(missingPricingInteraction);
    const duplicatePricingResult = await handleExpense(duplicatePricingInteraction);

    expect(missingPricingResult.data.embeds[0].title).toBe("Invalid expense input");
    expect(duplicatePricingResult.data.embeds[0].title).toBe("Invalid expense input");
  });

  it("rejects_invalid_abbreviated_amounts", async () => {
    const interaction = makeInteraction("Blaze Rods", 500, [
      { name: "price_per_item", value: "fifty" },
    ]);

    const result = await handleExpense(interaction);
    expect(result.data.embeds[0].description).toContain("must be valid");
  });
});
