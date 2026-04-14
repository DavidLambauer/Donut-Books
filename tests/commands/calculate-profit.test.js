import { describe, it, expect } from "vitest";
import { InteractionResponseType } from "discord-interactions";
import { handleCalculateProfit } from "../../src/commands/calculate-profit.js";

describe("handleCalculateProfit", () => {
  it("calculates_profit_from_bone_blocks", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
          { name: "kelp_block_price", value: "100k" },
        ],
      },
    };

    const result = handleCalculateProfit(interaction);

    expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    const embed = result.data.embeds[0];
    expect(embed.title).toBe("Profit Breakdown");

    expect(embed.fields).toContainEqual({ name: "Dried Kelp Blocks", value: "48", inline: true });
    expect(embed.fields).toContainEqual({ name: "Revenue", value: "$4,800,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Total Cost", value: "$3,480,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Profit", value: "$1,320,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Leftover", value: "$20,000", inline: true });
  });

  it("calculates_profit_from_bones", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3m" },
          { name: "bone_price", value: "15k" },
          { name: "blaze_rod_price", value: "30k" },
          { name: "kelp_block_price", value: "95k" },
        ],
      },
    };

    const result = handleCalculateProfit(interaction);

    const embed = result.data.embeds[0];
    expect(embed.fields[0].name).toBe("Bones");
    expect(embed.fields).toContainEqual({ name: "Kelp Produced", value: "396", inline: true });
    expect(embed.fields).toContainEqual({ name: "Dried Kelp Blocks", value: "44", inline: true });
    expect(embed.fields).toContainEqual({ name: "Revenue", value: "$4,180,000", inline: true });
    expect(embed.fields).toContainEqual({ name: "Profit", value: "$1,210,000", inline: true });
  });

  it("rejects_missing_or_duplicate_bone_inputs", () => {
    const missingBoneInput = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "blaze_rod_price", value: "30k" },
          { name: "kelp_block_price", value: "100k" },
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
          { name: "kelp_block_price", value: "100k" },
        ],
      },
    };

    expect(handleCalculateProfit(missingBoneInput).data.embeds[0].description).toContain("exactly one");
    expect(handleCalculateProfit(duplicateBoneInput).data.embeds[0].description).toContain("exactly one");
  });

  it("rejects_invalid_abbreviated_amounts", () => {
    const interaction = {
      data: {
        options: [
          { name: "budget", value: "3.5m" },
          { name: "bone_block_price", value: "50k" },
          { name: "blaze_rod_price", value: "30k" },
          { name: "kelp_block_price", value: "100x" },
        ],
      },
    };

    const result = handleCalculateProfit(interaction);
    expect(result.data.embeds[0].description).toContain("must be valid");
  });
});