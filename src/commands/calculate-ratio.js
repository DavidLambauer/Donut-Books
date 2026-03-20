import { InteractionResponseType } from "discord-interactions";
import { formatNumber } from "../lib/discord.js";

const BONE_BLOCKS_PER_UNIT = 4;
const BLAZE_RODS_PER_UNIT = 3;

export function handleCalculateRatio(interaction) {
  const options = interaction.data.options || [];

  const budget = options.find((o) => o.name === "budget")?.value || 0;
  const boneBlockPrice = options.find((o) => o.name === "bone_block_price")?.value || 0;
  const blazeRodPrice = options.find((o) => o.name === "blaze_rod_price")?.value || 0;

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
  const blazeRods = units * BLAZE_RODS_PER_UNIT;
  const totalCost = units * costPerUnit;
  const leftover = budget - totalCost;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Budget Breakdown",
        color: 0xfee75c,
        fields: [
          { name: "Bone Blocks", value: `${formatNumber(boneBlocks)} × $${formatNumber(boneBlockPrice)} = $${formatNumber(boneBlocks * boneBlockPrice)}`, inline: false },
          { name: "Blaze Rods", value: `${formatNumber(blazeRods)} × $${formatNumber(blazeRodPrice)} = $${formatNumber(blazeRods * blazeRodPrice)}`, inline: false },
          { name: "Total", value: `$${formatNumber(totalCost)}`, inline: true },
          { name: "Leftover", value: `$${formatNumber(leftover)}`, inline: true },
        ],
      }],
    },
  };
}
