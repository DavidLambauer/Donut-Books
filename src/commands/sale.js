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
      data: {
        embeds: [{
          title: "Failed to log sale",
          description: error.message,
          color: 0xff0000,
        }],
      },
    };
  }

  const perUnit = totalRevenue / quantity;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Sale Logged",
        color: 0x57f287,
        fields: [
          { name: "Item", value: "Dried Kelp Blocks", inline: true },
          { name: "Quantity", value: formatNumber(quantity), inline: true },
          { name: "Total", value: `$${formatNumber(totalRevenue)}`, inline: true },
          { name: "Price/ea", value: `$${formatNumber(perUnit)}`, inline: true },
        ],
        footer: { text: `Logged by ${user.username}` },
        timestamp: new Date().toISOString(),
      }],
    },
  };
}
