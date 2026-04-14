import { describe, it, expect } from "vitest";
import { InteractionResponseType } from "discord-interactions";
import { handleCalculateRatio } from "../../src/commands/calculate-ratio.js";

describe("handleCalculateRatio", () => {
  it("calculates_optimal_purchase_split", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
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

  it("calculates_optimal_purchase_split_from_bones", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3m" },
          { name: "bone_price", value: "15k" },
          { name: "blaze_rod_price", value: "30k" },
        ],
      },
    };

    const result = handleCalculateRatio(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.fields[0].name).toBe("Bones");
    expect(embed.fields[0].value).toContain("132");
    expect(embed.fields[1].value).toContain("33");
  });

  it("shows_message_when_budget_too_small", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "100" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
        ],
      },
    };

    const result = handleCalculateRatio(interaction);

    const embed = result.data.embeds[0];
    expect(embed.description).toContain("too small");
  });

  it("rejects_missing_or_duplicate_bone_inputs", () => {
    const missingBoneInput = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "blaze_rod_price", value: "30k" },
        ],
      },
    };

    const duplicateBoneInput = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "bone_price", value: "16.66667k" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
        ],
      },
    };

    expect(handleCalculateRatio(missingBoneInput).data.embeds[0].description).toContain("exactly one");
    expect(handleCalculateRatio(duplicateBoneInput).data.embeds[0].description).toContain("exactly one");
  });

  it("rejects_invalid_abbreviated_amounts", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3.5x" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
        ],
      },
    };

    const result = handleCalculateRatio(interaction);
    expect(result.data.embeds[0].description).toContain("must be valid");
  });
});
