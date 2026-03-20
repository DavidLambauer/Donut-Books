import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

const mockUpdate = vi.fn().mockReturnValue({
  is: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [
              { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
              { discord_user_id: "2", discord_username: "Alex", total_cost: 5000000 },
            ],
            error: null,
          }),
        }),
        update: mockUpdate,
      };
    }
    if (table === "sales") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [{ discord_user_id: "1", discord_username: "David", total_revenue: 20000000 }],
            error: null,
          }),
        }),
        update: mockUpdate,
      };
    }
    if (table === "payouts") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "payout-uuid" },
              error: null,
            }),
          }),
        }),
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handlePayout } from "../../src/commands/payout.js";

describe("handlePayout", () => {
  it("settles_cycle_and_shows_embed_breakdown", async () => {
    const interaction = { member: { user: { id: "1" } } };
    const result = await handlePayout(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Payout Settled");
    expect(embed.fields).toContainEqual({ name: "Total Expenses", value: "$15,000,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Revenue", value: "$20,000,000", inline: true });

    const breakdown = embed.fields.find((f) => f.name === "Player Breakdown");
    expect(breakdown.value).toContain("David");
    expect(breakdown.value).toContain("Alex");

    // David sold $20M, owed $13.33M -> pays Alex $6,666,667
    const settlements = embed.fields.find((f) => f.name === "Settlements");
    expect(settlements.value).toContain("**David** → **Alex**");
  });
});
