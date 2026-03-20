import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";
import { calculateSettlements } from "../lib/settlements.js";

export async function handlePayout(interaction) {
  const [expensesResult, salesResult] = await Promise.all([
    supabase.from("expenses").select("discord_user_id, discord_username, total_cost").is("payout_id", null),
    supabase.from("sales").select("discord_user_id, discord_username, total_revenue").is("payout_id", null),
  ]);

  if (expensesResult.error || salesResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Error",
          description: "Failed to fetch data for payout.",
          color: 0xff0000,
        }],
      },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;

  if (expenses.length === 0 && sales.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Nothing to Settle",
          description: "No expenses or sales in the current cycle.",
          color: 0x5865f2,
        }],
      },
    };
  }

  if (expenses.length === 0 && sales.length > 0) {
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_revenue), 0);

    const { data: payoutRecord, error: payoutError } = await supabase
      .from("payouts")
      .insert({
        total_expenses: 0,
        total_revenue: totalRevenue,
        total_profit: totalRevenue,
        breakdown: [],
      })
      .select()
      .single();

    if (payoutError) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: "Error",
            description: `Failed to create payout: ${payoutError.message}`,
            color: 0xff0000,
          }],
        },
      };
    }

    await supabase.from("sales").update({ payout_id: payoutRecord.id }).is("payout_id", null);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Payout Settled",
          description: "No expenses this cycle — all revenue is pure profit. Split it however you like!",
          color: 0x57f287,
          fields: [
            { name: "Total Revenue", value: `$${formatNumber(totalRevenue)}`, inline: true },
            { name: "Total Profit", value: `$${formatNumber(totalRevenue)}`, inline: true },
          ],
          footer: { text: "Cycle settled — all sales have been cleared" },
          timestamp: new Date().toISOString(),
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

  const breakdown = Object.entries(playerTotals)
    .sort(([, a], [, b]) => b.invested - a.invested)
    .map(([userId, player]) => {
      const share = player.invested / totalExpenses;
      const profitShare = Math.round(totalProfit * share);
      const totalPayout = player.invested + profitShare;
      return {
        discord_user_id: userId,
        username: player.username,
        invested: player.invested,
        share: share,
        profitShare: profitShare,
        payout: totalPayout,
      };
    });

  const salesByPlayer = {};
  for (const s of sales) {
    if (!salesByPlayer[s.discord_user_id]) {
      salesByPlayer[s.discord_user_id] = { username: s.discord_username, revenue: 0 };
    }
    salesByPlayer[s.discord_user_id].revenue += Number(s.total_revenue);
  }

  const settlements = calculateSettlements(breakdown, salesByPlayer);
  const settlementLines = settlements.map(
    (s) => `**${s.from}** → **${s.to}**: $${formatNumber(s.amount)}`
  );

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
      data: {
        embeds: [{
          title: "Error",
          description: `Failed to create payout: ${payoutError.message}`,
          color: 0xff0000,
        }],
      },
    };
  }

  await Promise.all([
    supabase.from("expenses").update({ payout_id: payoutRecord.id }).is("payout_id", null),
    supabase.from("sales").update({ payout_id: payoutRecord.id }).is("payout_id", null),
  ]);

  const profitColor = totalProfit >= 0 ? 0x57f287 : 0xed4245;

  const playerLines = breakdown.map((entry) => {
    const profitSign = entry.profitShare >= 0 ? "+" : "";
    return `**${entry.username}** (${(entry.share * 100).toFixed(1)}%)\nSpent: $${formatNumber(entry.invested)} · Profit: ${profitSign}$${formatNumber(entry.profitShare)} · **Total: $${formatNumber(entry.payout)}**`;
  });

  const fields = [
    { name: "Total Expenses", value: `$${formatNumber(totalExpenses)}`, inline: true },
    { name: "Total Revenue", value: `$${formatNumber(totalRevenue)}`, inline: true },
    { name: "Profit", value: `$${formatNumber(totalProfit)}`, inline: true },
    { name: "Player Breakdown", value: playerLines.join("\n") },
  ];

  if (settlementLines.length > 0) {
    fields.push({ name: "Settlements", value: settlementLines.join("\n") });
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "Payout Settled",
        color: profitColor,
        fields,
        footer: { text: "Cycle settled — all expenses and sales have been cleared" },
        timestamp: new Date().toISOString(),
      }],
    },
  };
}
