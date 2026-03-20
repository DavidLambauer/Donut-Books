import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    discord_username: "David",
                    item: "Bone Blocks",
                    quantity: 64,
                    total_cost: 2000000,
                    created_at: "2026-03-18T10:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "sales") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    discord_username: "Alex",
                    quantity: 128,
                    total_revenue: 5000000,
                    created_at: "2026-03-19T14:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "payouts") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  settled_at: "2026-03-15T00:00:00Z",
                  total_revenue: 20000000,
                  total_profit: 5000000,
                },
              ],
              error: null,
            }),
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handleHistory } from "../../src/commands/history.js";

describe("handleHistory", () => {
  it("shows_current_transactions_and_past_cycles", async () => {
    const result = await handleHistory({});

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("History");

    const transactions = embed.fields.find((f) => f.name === "Current Cycle");
    expect(transactions.value).toContain("David");
    expect(transactions.value).toContain("Bone Blocks");
    expect(transactions.value).toContain("Alex");
    expect(transactions.value).toContain("sold");

    const pastCycles = embed.fields.find((f) => f.name === "Past Cycles");
    expect(pastCycles.value).toContain("$5,000,000");

    expect(embed.image.url).toContain("quickchart.io");
  });
});
