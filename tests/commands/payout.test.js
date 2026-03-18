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
            data: [{ total_revenue: 20000000 }],
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
  it("settles_cycle_and_shows_breakdown", async () => {
    const interaction = { member: { user: { id: "1" } } };
    const result = await handlePayout(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const content = result.data.content;
    expect(content).toContain("Payout");
    expect(content).toContain("David");
    expect(content).toContain("Alex");
    expect(content).toContain("15,000,000");
    expect(content).toContain("20,000,000");
  });
});
