export function buildChartUrl(payouts) {
  if (payouts.length === 0) return null;

  const labels = payouts.map((p) => {
    const d = new Date(p.settled_at);
    return `${d.toLocaleString("en-US", { month: "short" })} ${d.getUTCDate()}`;
  });

  const data = payouts.map((p) => Number(p.total_profit));

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Profit",
        data,
        borderColor: "#57f287",
        backgroundColor: "rgba(87,242,135,0.1)",
        fill: true,
      }],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&w=500&h=250&bkg=rgb(47,49,54)`;
}
