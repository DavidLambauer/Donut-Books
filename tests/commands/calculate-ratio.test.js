import { describe, it, expect } from "vitest";
import { InteractionResponseType } from "discord-interactions";
import { handleCalculateRatio } from "../../src/commands/calculate-ratio.js";

describe("handleCalculateRatio", () => {
  it("calculates_optimal_purchase_split", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: 3500000 },
          { name: "bone_block_price", value: 50000 },
          { name: "blaze_rod_price", value: 30000 },
        ],
      },
    };

    const result = handleCalculateRatio(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Budget Breakdown");

    // cost per unit = (4 * 50000) + (3 * 30000) = 290000
    // units = floor(3500000 / 290000) = 12
    // bone blocks = 48, blaze rods = 36
    // total = 12 * 290000 = 3480000, leftover = 20000
    const body = embed.fields.map((f) => f.value).join(" ");
    expect(body).toContain("48");
    expect(body).toContain("36");
    expect(body).toContain("$3,480,000");
    expect(body).toContain("$20,000");
  });

  it("shows_message_when_budget_too_small", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: 100 },
          { name: "bone_block_price", value: 50000 },
          { name: "blaze_rod_price", value: 30000 },
        ],
      },
    };

    const result = handleCalculateRatio(interaction);

    const embed = result.data.embeds[0];
    expect(embed.description).toContain("too small");
  });
});
