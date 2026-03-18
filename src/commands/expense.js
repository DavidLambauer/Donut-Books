import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleExpense(interaction) {
  const user = interaction.member.user;
  const options = interaction.data.options;

  const item = options.find((o) => o.name === "item").value;
  const quantity = options.find((o) => o.name === "quantity").value;
  const totalCost = options.find((o) => o.name === "total").value;

  const { error } = await supabase.from("expenses").insert({
    discord_user_id: user.id,
    discord_username: user.username,
    item,
    quantity,
    total_cost: totalCost,
  });

  if (error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to log expense: ${error.message}` },
    };
  }

  const perUnit = totalCost / quantity;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Logged ${formatNumber(quantity)} ${item} for $${formatNumber(totalCost)} ($${formatNumber(perUnit)}/ea) by ${user.username}`,
    },
  };
}
