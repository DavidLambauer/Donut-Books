export function calculateSettlements(breakdown, salesByPlayer) {
  const nets = {};

  for (const entry of breakdown) {
    const revenue = salesByPlayer[entry.discord_user_id]?.revenue ?? 0;
    nets[entry.discord_user_id] = {
      username: entry.username,
      net: revenue - entry.payout,
    };
  }

  for (const [userId, seller] of Object.entries(salesByPlayer)) {
    if (!nets[userId]) {
      nets[userId] = {
        username: seller.username,
        net: seller.revenue,
      };
    }
  }

  const debtors = [];
  const creditors = [];

  for (const [, player] of Object.entries(nets)) {
    if (player.net > 0) debtors.push({ ...player });
    else if (player.net < 0) creditors.push({ ...player, net: -player.net });
  }

  const settlements = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.net - a.net);
    creditors.sort((a, b) => b.net - a.net);

    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.net, creditor.net);

    settlements.push({ from: debtor.username, to: creditor.username, amount });

    debtor.net -= amount;
    creditor.net -= amount;

    if (debtor.net === 0) debtors.shift();
    if (creditor.net === 0) creditors.shift();
  }

  return settlements;
}
