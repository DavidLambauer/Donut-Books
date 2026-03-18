import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";

export async function handlePayout(interaction) {
  const [expensesResult, salesResult] = await Promise.all([
    supabase.from("expenses").select("discord_user_id, discord_username, total_cost").is("payout_id", null),
    supabase.from("sales").select("total_revenue").is("payout_id", null),
  ]);

  if (expensesResult.error || salesResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Failed to fetch data for payout." },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "No expenses to settle in the current cycle." },
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

  const breakdown = Object.entries(playerTotals).map(([userId, player]) => {
    const share = player.invested / totalExpenses;
    const payout = player.invested + totalProfit * share;
    return {
      discord_user_id: userId,
      username: player.username,
      invested: player.invested,
      share: share,
      payout: Math.round(payout),
    };
  });

  const { data: payoutRecord, error: payoutError } = await supabase
    .from("payouts")
    .insert({
      total_expenses: totalExpenses,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      breakdown: breakdown,
    })
    .select()
    .single();

  if (payoutError) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Failed to create payout: ${payoutError.message}` },
    };
  }

  await Promise.all([
    supabase.from("expenses").update({ payout_id: payoutRecord.id }).is("payout_id", null),
    supabase.from("sales").update({ payout_id: payoutRecord.id }).is("payout_id", null),
  ]);

  let lines = [
    `**Payout Settled**`,
    `Total Expenses: $${formatNumber(totalExpenses)}`,
    `Total Revenue: $${formatNumber(totalRevenue)}`,
    `Profit: $${formatNumber(totalProfit)}`,
    ``,
    `| Player | Invested | Share | Payout |`,
    `|--------|----------|-------|--------|`,
  ];

  for (const entry of breakdown) {
    lines.push(
      `| ${entry.username} | $${formatNumber(entry.invested)} | ${(entry.share * 100).toFixed(1)}% | $${formatNumber(entry.payout)} |`,
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: lines.join("\n") },
  };
}
