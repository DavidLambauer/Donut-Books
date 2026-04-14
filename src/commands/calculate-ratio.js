import { InteractionResponseType } from "discord-interactions";
import { formatNumber } from "../lib/discord.js";
import { parseCompactOption } from "../lib/compact-number.js";
import { calculateOptimalPurchaseSplit } from "../lib/calculate-ratio.js";

export function handleCalculateRatio(interaction) {
  const options = interaction.data.options || [];

  const budgetResult = parseCompactOption(options, "budget", "Budget");
  const bonePriceResult = parseCompactOption(options, "bone_price", "Bone price");
  const boneBlockPriceResult = parseCompactOption(options, "bone_block_price", "Bone Block price");
  const blazeRodPriceResult = parseCompactOption(options, "blaze_rod_price", "Blaze Rod price");

  if (budgetResult.error || bonePriceResult.error || boneBlockPriceResult.error || blazeRodPriceResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Budget Breakdown",
          description: budgetResult.error || bonePriceResult.error || boneBlockPriceResult.error || blazeRodPriceResult.error,
          color: 0xed4245,
        }],
      },
    };
  }

  if (budgetResult.missing || blazeRodPriceResult.missing) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Budget Breakdown",
          description: "Budget and Blaze Rod price are required.",
          color: 0xed4245,
        }],
      },
    };
  }

  const budget = budgetResult.value;
  const blazeRodPrice = blazeRodPriceResult.value;
  const breakdown = calculateOptimalPurchaseSplit({
    budget,
    bonePrice: bonePriceResult.missing ? undefined : bonePriceResult.value,
    boneBlockPrice: boneBlockPriceResult.missing ? undefined : boneBlockPriceResult.value,
    blazeRodPrice,
  });

  if (breakdown.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Budget Breakdown",
          description: breakdown.error,
          color: 0xed4245,
        }],
      },
    };
  }

  const boneField = breakdown.usingBones
    ? {
        name: "Bones",
        value: `${formatNumber(breakdown.bones)} × $${formatNumber(breakdown.bonePrice)} = $${formatNumber(breakdown.bones * breakdown.bonePrice)}`,
        inline: false,
      }
    : {
        name: "Bone Blocks",
        value: `${formatNumber(breakdown.boneBlocks)} × $${formatNumber(breakdown.boneBlockPrice)} = $${formatNumber(breakdown.boneBlocks * breakdown.boneBlockPrice)}`,
        inline: false,
      };

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Budget Breakdown",
        color: 0xfee75c,
        fields: [
          boneField,
          { name: "Blaze Rods", value: `${formatNumber(breakdown.blazeRods)} × $${formatNumber(blazeRodPrice)} = $${formatNumber(breakdown.blazeRods * blazeRodPrice)}`, inline: false },
          { name: "Total", value: `$${formatNumber(breakdown.totalCost)}`, inline: true },
          { name: "Leftover", value: `$${formatNumber(breakdown.leftover)}`, inline: true },
        ],
      }],
    },
  };
}
