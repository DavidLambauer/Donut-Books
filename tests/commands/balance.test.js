import { describe, it, expect, vi } from "vitest";
import { InteractionResponseType } from "discord-interactions";

vi.mock("../../src/lib/supabase.js", () => {
  const fromMock = vi.fn((table) => {
    if (table === "expenses") {
      return {
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [
              { discord_user_id: "1", discord_username: "David", total_cost: 10000000 },
              { discord_user_id: "2", discord_username: "Alex", total_cost: 3000000 },
              { discord_user_id: "1", discord_username: "David", total_cost: 2000000 },
            ],
            error: null,
          }),
        }),
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
      };
    }
  });
  return { default: { from: fromMock } };
});

import { handleBalance } from "../../src/commands/balance.js";

describe("handleBalance", () => {
  it("shows_proportional_breakdown", async () => {
    const interaction = { member: { user: { id: "1" } } };
    const result = await handleBalance(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const content = result.data.content;
    expect(content).toContain("15,000,000");
    expect(content).toContain("20,000,000");
    expect(content).toContain("5,000,000");
    expect(content).toContain("David");
    expect(content).toContain("Alex");
  });
});
