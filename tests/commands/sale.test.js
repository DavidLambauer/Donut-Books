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
  it("logs_a_sale_and_returns_embed", async () => {
    const interaction = makeInteraction(5000, 3750000);
    const result = await handleSale(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Sale Logged");
    expect(embed.fields).toContainEqual({ name: "Item", value: "Dried Kelp Blocks", inline: true });
    expect(embed.fields).toContainEqual({ name: "Quantity", value: "5,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total", value: "$3,750,000", inline: true });
    expect(embed.footer.text).toContain("TestUser");
  });
});
