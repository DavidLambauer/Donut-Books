import { describe, it, expect, vi, beforeEach } from "vitest";
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

function makeInteraction(item, quantity, total) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "item", value: item },
        { name: "quantity", value: quantity },
        { name: "total", value: total },
      ],
    },
  };
}

describe("handleExpense", () => {
  it("logs_an_expense_and_returns_embed", async () => {
    const interaction = makeInteraction("Bone Blocks", 300000, 10000000);
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
    const interaction = makeInteraction("Blaze Rods", 500, 75000);
    const result = await handleExpense(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields).toContainEqual({ name: "Price/ea", value: "$150", inline: true });
  });
});
