import { InteractionResponseType } from "discord-interactions";
import { parseCompactOption } from "../lib/compact-number.js";
import { formatNumber } from "../lib/discord.js";
import { calculateOptimalPurchaseSplit } from "../lib/calculate-ratio.js";

const KELP_PER_BONE = 3;
const KELP_PER_BONE_BLOCK = 9;
const KELP_PER_KELP_BLOCK = 9;

export function handleCalculateProfit(interaction) {
  const options = interaction.data.options || [];

  const budgetResult = parseCompactOption(options, "budget", "Budget");
  const bonePriceResult = parseCompactOption(options, "bone_price", "Bone price");
  const boneBlockPriceResult = parseCompactOption(options, "bone_block_price", "Bone Block price");
  const blazeRodPriceResult = parseCompactOption(options, "blaze_rod_price", "Blaze Rod price");
  const kelpBlockPriceResult = parseCompactOption(options, "kelp_block_price", "Kelp Block price");

  if (budgetResult.error || bonePriceResult.error || boneBlockPriceResult.error || blazeRodPriceResult.error || kelpBlockPriceResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Profit Breakdown",
          description: budgetResult.error || bonePriceResult.error || boneBlockPriceResult.error || blazeRodPriceResult.error || kelpBlockPriceResult.error,
          color: 0xed4245,
        }],
      },
    };
  }

  if (budgetResult.missing || blazeRodPriceResult.missing || kelpBlockPriceResult.missing) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Profit Breakdown",
          description: "Budget, Blaze Rod price, and Kelp Block price are required.",
          color: 0xed4245,
        }],
      },
    };
  }

  const breakdown = calculateOptimalPurchaseSplit({
    budget: budgetResult.value,
    bonePrice: bonePriceResult.missing ? undefined : bonePriceResult.value,
    boneBlockPrice: boneBlockPriceResult.missing ? undefined : boneBlockPriceResult.value,
    blazeRodPrice: blazeRodPriceResult.value,
  });

  if (breakdown.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Profit Breakdown",
          description: breakdown.error,
          color: 0xed4245,
        }],
      },
    };
  }

  const kelpProduced = breakdown.usingBones
    ? breakdown.bones * KELP_PER_BONE
    : breakdown.boneBlocks * KELP_PER_BONE_BLOCK;
  const kelpBlocksProduced = Math.floor(kelpProduced / KELP_PER_KELP_BLOCK);
  const revenue = kelpBlocksProduced * kelpBlockPriceResult.value;
  const profit = revenue - breakdown.totalCost;
  const accentColor = profit >= 0 ? 0x57f287 : 0xed4245;
  const materialField = breakdown.usingBones
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
        title: "Profit Breakdown",
        color: accentColor,
        fields: [
          materialField,
          { name: "Blaze Rods", value: `${formatNumber(breakdown.blazeRods)} × $${formatNumber(blazeRodPriceResult.value)} = $${formatNumber(breakdown.blazeRods * blazeRodPriceResult.value)}`, inline: false },
          { name: "Kelp Produced", value: formatNumber(kelpProduced), inline: true },
          { name: "Dried Kelp Blocks", value: formatNumber(kelpBlocksProduced), inline: true },
          { name: "Revenue", value: `$${formatNumber(revenue)}`, inline: true },
          { name: "Total Cost", value: `$${formatNumber(breakdown.totalCost)}`, inline: true },
          { name: "Profit", value: `$${formatNumber(profit)}`, inline: true },
          { name: "Leftover", value: `$${formatNumber(breakdown.leftover)}`, inline: true },
        ],
      }],
    },
  };
}