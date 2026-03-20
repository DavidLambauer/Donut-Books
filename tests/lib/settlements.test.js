import { describe, it, expect } from "vitest";
import { calculateSettlements } from "../../src/lib/settlements.js";

describe("calculateSettlements", () => {
  it("calculates_transfers_when_one_seller_owes_two_investors", () => {
    const breakdown = [
      { discord_user_id: "1", username: "David", payout: 13333333 },
      { discord_user_id: "2", username: "Alex", payout: 6666667 },
    ];
    const salesByPlayer = {
      "1": { username: "David", revenue: 20000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);

    expect(settlements).toEqual([
      { from: "David", to: "Alex", amount: 6666667 },
    ]);
  });

  it("calculates_transfers_with_multiple_sellers_and_investors", () => {
    const breakdown = [
      { discord_user_id: "1", username: "Alice", payout: 4000000 },
      { discord_user_id: "2", username: "Bob", payout: 4000000 },
      { discord_user_id: "3", username: "Carol", payout: 7000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Alice", revenue: 10000000 },
      "2": { username: "Bob", revenue: 5000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);

    expect(settlements).toEqual([
      { from: "Alice", to: "Carol", amount: 6000000 },
      { from: "Bob", to: "Carol", amount: 1000000 },
    ]);
  });

  it("returns_empty_array_when_no_transfers_needed", () => {
    const breakdown = [
      { discord_user_id: "1", username: "Solo", payout: 5000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Solo", revenue: 5000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);
    expect(settlements).toEqual([]);
  });

  it("handles_player_who_sold_but_has_no_expenses", () => {
    const breakdown = [
      { discord_user_id: "2", username: "Bob", payout: 10000000 },
    ];
    const salesByPlayer = {
      "1": { username: "Alice", revenue: 10000000 },
    };

    const settlements = calculateSettlements(breakdown, salesByPlayer);
    expect(settlements).toEqual([
      { from: "Alice", to: "Bob", amount: 10000000 },
    ]);
  });
});
