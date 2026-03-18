import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleSale(interaction) {
  const user = interaction.member.user;
  const options = interaction.data.options;

  const quantity = options.find((o) => o.name === "quantity").value;
  const totalRevenue = options.find((o) => o.name === "total").value;

  const { error } = await supabase.from("sales").insert({
    discord_user_id: user.id,
    discord_username: user.username,
    quantity,
    total_revenue: totalRevenue,
  });

  if (error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to log sale: ${error.message}` },
    };
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Logged sale of ${formatNumber(quantity)} Dried Kelp Blocks for $${formatNumber(totalRevenue)} by ${user.username}`,
    },
  };
}
