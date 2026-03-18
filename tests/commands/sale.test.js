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

import { handleSale } from "../../src/commands/sale.js";

function makeInteraction(quantity, total) {
  return {
    member: {
      user: { id: "123456", username: "TestUser" },
    },
    data: {
      options: [
        { name: "quantity", value: quantity },
        { name: "total", value: total },
      ],
    },
  };
}

describe("handleSale", () => {
  it("logs_a_sale_and_returns_confirmation", async () => {
    const interaction = makeInteraction(5000, 3750000);
    const result = await handleSale(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(result.data.content).toContain("Dried Kelp Blocks");
    expect(result.data.content).toContain("5,000");
    expect(result.data.content).toContain("3,750,000");
    expect(result.data.content).toContain("TestUser");
  });
});
