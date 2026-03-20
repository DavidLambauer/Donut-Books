import { InteractionResponseType } from "discord-interactions";
import supabase from "../lib/supabase.js";
import { formatNumber } from "../lib/discord.js";
import { buildChartUrl } from "../lib/chart.js";

export async function handleHistory(interaction) {
  const [expensesResult, salesResult, payoutsResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("discord_username, item, quantity, total_cost, created_at")
      .is("payout_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("sales")
      .select("discord_username, quantity, total_revenue, created_at")
      .is("payout_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payouts")
      .select("settled_at, total_revenue, total_profit")
      .order("settled_at", { ascending: false })
      .limit(5),
  ]);

  if (expensesResult.error || salesResult.error || payoutsResult.error) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "Error",
          description: "Failed to fetch history data.",
          color: 0xff0000,
        }],
      },
    };
  }

  const expenses = expensesResult.data;
  const sales = salesResult.data;
  const payouts = payoutsResult.data;

  if (expenses.length === 0 && sales.length === 0 && payouts.length === 0) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: "History",
          description: "Nothing to show. Use `/expense` or `/sale` to get started.",
          color: 0x5865f2,
        }],
      },
    };
  }

  const fields = [];

  // Current cycle transactions
  const transactions = [
    ...expenses.map((e) => ({
      date: new Date(e.created_at),
      text: `**${e.discord_username}** bought ${e.quantity} ${e.item} ($${formatNumber(e.total_cost)})`,
    })),
    ...sales.map((s) => ({
      date: new Date(s.created_at),
      text: `**${s.discord_username}** sold ${s.quantity} Dried Kelp Blocks ($${formatNumber(s.total_revenue)})`,
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 10);

  if (transactions.length > 0) {
    const lines = transactions.map((t) => {
      const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      return `${dateStr} — ${t.text}`;
    });
    const fieldName = transactions.length >= 10 ? "Current Cycle (last 10)" : "Current Cycle";
    fields.push({ name: fieldName, value: lines.join("\n") });
  } else {
    fields.push({ name: "Current Cycle", value: "No transactions yet this cycle." });
  }

  // Past cycles
  if (payouts.length > 0) {
    const cycleLines = payouts.map((p, i) => {
      const d = new Date(p.settled_at);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const profitSign = Number(p.total_profit) >= 0 ? "+" : "";
      return `${dateStr} — Revenue: $${formatNumber(p.total_revenue)} · Profit: ${profitSign}$${formatNumber(p.total_profit)}`;
    });
    fields.push({ name: "Past Cycles", value: cycleLines.join("\n") });
  }

  // Chart
  const chartUrl = payouts.length > 0 ? buildChartUrl([...payouts].reverse()) : null;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: "History",
        color: 0x5865f2,
        fields,
        ...(chartUrl ? { image: { url: chartUrl } } : {}),
      }],
    },
  };
}
