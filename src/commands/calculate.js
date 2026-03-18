import { InteractionResponseType } from "discord-interactions";
import { formatNumber } from "../lib/discord.js";

export async function handleCalculate(interaction) {
  const options = interaction.data.options || [];

  const bones = options.find((o) => o.name === "bones")?.value || 0;
  const boneBlocks = options.find((o) => o.name === "bone_blocks")?.value || 0;

  const boneMealFromBones = bones * 3;
  const boneMealFromBlocks = boneBlocks * 9;
  const totalBoneMeal = boneMealFromBones + boneMealFromBlocks;
  const totalKelp = totalBoneMeal;
  const blazeRodsNeeded = Math.ceil(totalKelp / 12);

  const inputs = [];
  if (bones > 0) inputs.push(`${formatNumber(bones)} Bones`);
  if (boneBlocks > 0) inputs.push(`${formatNumber(boneBlocks)} Bone Blocks`);
  if (inputs.length === 0) inputs.push("Nothing");

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Farm Calculator",
        color: 0xfee75c,
        fields: [
          { name: "Input", value: inputs.join(" + "), inline: false },
          { name: "Bone Meal", value: formatNumber(totalBoneMeal), inline: true },
          { name: "Kelp Produced", value: formatNumber(totalKelp), inline: true },
          { name: "Blaze Rods Needed", value: formatNumber(blazeRodsNeeded), inline: true },
        ],
      }],
    },
  };
}
