import { InteractionResponseType } from "discord-interactions";
import { formatNumber } from "../lib/discord.js";
import { parseCompactOption } from "../lib/compact-number.js";

const BONE_BLOCKS_PER_UNIT = 4;
const BONES_PER_BONE_BLOCK = 3;
const BLAZE_RODS_PER_UNIT = 3;

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

  const hasBonePrice = !bonePriceResult.missing;
  const hasBoneBlockPrice = !boneBlockPriceResult.missing;

  if (hasBonePrice === hasBoneBlockPrice) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Budget Breakdown",
          description: "Provide exactly one of Bone price or Bone Block price.",
          color: 0xed4245,
        }],
      },
    };
  }

  const usingBones = hasBonePrice;
  const bonePrice = bonePriceResult.value;
  const boneBlockPrice = usingBones ? bonePrice * BONES_PER_BONE_BLOCK : boneBlockPriceResult.value;

  const costPerUnit = (BONE_BLOCKS_PER_UNIT * boneBlockPrice) + (BLAZE_RODS_PER_UNIT * blazeRodPrice);

  if (costPerUnit <= 0 || budget < costPerUnit) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Budget Breakdown",
          description: "Budget too small for a full set (4 Bone Blocks + 3 Blaze Rods).",
          color: 0xed4245,
        }],
      },
    };
  }

  const units = Math.floor(budget / costPerUnit);
  const boneBlocks = units * BONE_BLOCKS_PER_UNIT;
  const bones = boneBlocks * BONES_PER_BONE_BLOCK;
  const blazeRods = units * BLAZE_RODS_PER_UNIT;
  const totalCost = units * costPerUnit;
  const leftover = budget - totalCost;
  const boneField = usingBones
    ? {
        name: "Bones",
        value: `${formatNumber(bones)} × $${formatNumber(bonePrice)} = $${formatNumber(bones * bonePrice)}`,
        inline: false,
      }
    : {
        name: "Bone Blocks",
        value: `${formatNumber(boneBlocks)} × $${formatNumber(boneBlockPrice)} = $${formatNumber(boneBlocks * boneBlockPrice)}`,
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
          { name: "Blaze Rods", value: `${formatNumber(blazeRods)} × $${formatNumber(blazeRodPrice)} = $${formatNumber(blazeRods * blazeRodPrice)}`, inline: false },
          { name: "Total", value: `$${formatNumber(totalCost)}`, inline: true },
          { name: "Leftover", value: `$${formatNumber(leftover)}`, inline: true },
        ],
      }],
    },
  };
}
