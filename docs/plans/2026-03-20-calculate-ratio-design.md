# /calculate-ratio Command

## Parameters
- `budget` (required, number) — total amount to spend
- `bone_block_price` (required, number) — price per bone block
- `blaze_rod_price` (required, number) — price per blaze rod

## Math
- Ratio: 4 Bone Blocks : 3 Blaze Rods
- Cost per unit = (4 x bone_block_price) + (3 x blaze_rod_price)
- Units = floor(budget / cost_per_unit)
- Bone Blocks = units x 4, Blaze Rods = units x 3
- Leftover = budget - (units x cost_per_unit)

## Edge Case
- Budget too small for 1 unit: show "Budget too small for a full set."

## No DB changes needed
Pure calculation, no persistence.
