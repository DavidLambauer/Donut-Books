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
      data: { content: "Failed to fetch balance data." },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "No expenses logged in the current cycle." },
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

  let lines = [
    `**Current Cycle**`,
    `Total Expenses: $${formatNumber(totalExpenses)}`,
    `Total Revenue: $${formatNumber(totalRevenue)}`,
    `Profit: $${formatNumber(totalProfit)}`,
    ``,
    `| Player | Invested | Share | Payout |`,
    `|--------|----------|-------|--------|`,
  ];

  for (const [, player] of Object.entries(playerTotals)) {
    const share = player.invested / totalExpenses;
    const payout = player.invested + totalProfit * share;
    lines.push(
      `| ${player.username} | $${formatNumber(player.invested)} | ${(share * 100).toFixed(1)}% | $${formatNumber(Math.round(payout))} |`,
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: lines.join("\n") },
  };
}
