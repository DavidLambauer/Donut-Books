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
  it("logs_an_expense_and_returns_confirmation", async () => {
    const interaction = makeInteraction("Bone Blocks", 300000, 10000000);
    const result = await handleExpense(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.content).toContain("Bone Blocks");
    expect(result.data.content).toContain("300,000");
    expect(result.data.content).toContain("10,000,000");
    expect(result.data.content).toContain("TestUser");
  });

  it("shows_per_unit_price", async () => {
    const interaction = makeInteraction("Blaze Rods", 500, 75000);
    const result = await handleExpense(interaction);

    expect(result.data.content).toContain("150");
  });
});
