import { describe, it, expect } from "vitest";
import { buildChartUrl } from "../../src/lib/chart.js";

describe("buildChartUrl", () => {
  it("builds_line_chart_url_from_payout_data", () => {
    const payouts = [
      { settled_at: "2026-03-08T00:00:00Z", total_profit: 3000000 },
      { settled_at: "2026-03-15T00:00:00Z", total_profit: 5000000 },
    ];

    const url = buildChartUrl(payouts);

    expect(url).toContain("https://quickchart.io/chart");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("line");
    expect(decoded).toContain("Mar 8");
    expect(decoded).toContain("Mar 15");
    expect(decoded).toContain("3000000");
    expect(decoded).toContain("5000000");
  });

  it("returns_null_when_no_payouts", () => {
    const url = buildChartUrl([]);
    expect(url).toBeNull();
  });

  it("handles_single_payout", () => {
    const payouts = [
      { settled_at: "2026-03-10T00:00:00Z", total_profit: 2000000 },
    ];

    const url = buildChartUrl(payouts);

    expect(url).toContain("https://quickchart.io/chart");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("2000000");
  });
});
