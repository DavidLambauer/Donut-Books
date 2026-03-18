import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handleBalance(interaction) {
  const [expensesResult, salesResult] = await Promise.all([
    supabase.from("expenses").select("discord_user_id, discord_username, total_cost").is("payout_id", null),
    supabase.from("sales").select("total_revenue").is("payout_id", null),
  ]);

  if (expensesResult.error || salesResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Error",
          description: "Failed to fetch balance data.",
          color: 0xff0000,
        }],
      },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Current Cycle",
          description: "No expenses logged yet. Use `/expense` to get started.",
          color: 0x5865f2,
        }],
      },
    };
  }

  const playerTotals = {};
  let totalExpenses = 0;

  for (const e of expenses) {
    const cost = Number(e.total_cost);
    totalExpenses += cost;
    if (!playerTotals[e.discord_user_id]) {
      playerTotals[e.discord_user_id] = { username: e.discord_username, invested: 0 };
    }
    playerTotals[e.discord_user_id].invested += cost;
  }

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitColor = totalProfit >= 0 ? 0x57f287 : 0xed4245;

  // Build player breakdown as a readable list
  const playerLines = Object.entries(playerTotals)
    .sort(([, a], [, b]) => b.invested - a.invested)
    .map(([, player]) => {
      const share = player.invested / totalExpenses;
      const payout = player.invested + totalProfit * share;
      return `**${player.username}** — Invested $${formatNumber(player.invested)} (${(share * 100).toFixed(1)}%) → Payout: $${formatNumber(Math.round(payout))}`;
    });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Current Cycle",
        color: profitColor,
        fields: [
          { name: "Total Expenses", value: `$${formatNumber(totalExpenses)}`, inline: true },
          { name: "Total Revenue", value: `$${formatNumber(totalRevenue)}`, inline: true },
          { name: "Profit", value: `$${formatNumber(totalProfit)}`, inline: true },
          { name: "Player Breakdown", value: playerLines.join("\n") },
        ],
        footer: { text: "Use /payout to settle this cycle" },
      }],
    },
  };
}
