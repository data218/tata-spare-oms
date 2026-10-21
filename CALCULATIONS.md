# Inventory and reorder calculations

The shared implementation is `src/inventory-math.js`. Main dashboard requirements
and Reorder Control Tower use the same calculation for each exact part number
and location:

- Consumption basis: preceding 180 days, excluding invalid and future dates.
- Daily consumption = six-month consumption / 180.
- Delivery demand = daily consumption × 7 days.
- Safety stock = daily consumption × 7 days.
- Target/reorder point = daily consumption × 14 days.
- Available stock = on hand − reserved.
- Order = max(0, target − available − in transit).
- Round the final order up to whole pieces, or 0.001 L/KG. Do not round the daily
  average, safety stock or delivery demand before calculating the order.

Example: six-month consumption 1,800 pieces means 10/day. The target is 140.
With 50 on hand, 10 reserved and 20 in transit, order 80 pieces.
Transfer suggestions preserve the supplying location's own 14-day requirement
and deduct stock allocated to earlier suggestions.

## Units and valuation

Use price-list UOM matched by exact part number. Tata L/KG quantities are stored
as millilitres/grams and converted once to litres/kilograms. Manual movements
use the displayed unit. NDP remains the price per catalogue unit.

Example: 208,000 ml = 208 L; at NDP 544.9088870505/L the value is 113,341.0485065.
Quantity totals show each unit separately. Prices and units that are missing are
flagged; their values are excluded from the priced subtotal. Unknown units do
not receive order recommendations.

The catalogue description is displayed; conflicting source descriptions are
flagged for review. The original database records are preserved. Receipt ageing
and days without movement use parsed dates; unknown dates are not counted as
recent or nonmoving. Manual movements predating a stock snapshot are flagged
for reconciliation rather than added to that snapshot again.

## Source data limitations and deployment

Comma-formatted import numbers now parse correctly (`1,000` becomes `1000`).
Previously truncated quantities cannot be reconstructed from stored values.
Re-import inventory and consumption for the affected periods with the updated
worker. Populate missing NDP/UOM and review description conflicts before treating
the priced subtotal as a complete valuation. A 180-day divisor requires a complete
180-day consumption history; partial imports will understate demand.

Update the permanent worker to the same commit as Vercel after its current job
finishes. No database schema migration or destructive data correction is included.

Validation: `npm test`, `npm run test:filters`, `npm run build`.
