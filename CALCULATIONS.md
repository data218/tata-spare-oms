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
Min/Max and safety-stock displays (including CSV) round up to whole pieces or
0.001 L/KG. Calculations retain the unrounded demand; rounding the displayed
levels does not change recommended orders. The Suggested Qty card shows one
labelled unit, with the full unit breakdown and definition available on click.

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

## Dashboard refresh

Dashboard reads use 1,000-row pages ordered by the indexed ID, continuing after
the last ID instead of using counts or large offsets. Each table has one page
request in flight. Statement timeouts retry the same cursor up to twice with
smaller pages. A failed page fails the refresh; partial tables never replace the
previously displayed data. The loading overlay reports the rows read so far.

## Recorded IN / OUT

Movement history consists of imported consumption and saved manual entries.
Positive consumption is OUT; negative consumption is an IN return. Manual
quantities already use the displayed unit. Source consumption converts ml/g to
L/KG once using the exact catalogue UOM. Locations use the same aliases as stock.

The user-confirmed sources are `tata_consumption_data` for consumption/returns
and `tata_movement_logs` for manual IN/OUT. The ledger does not reconstruct
receipts from current stock. Net movement is recorded IN minus OUT for the
selected period, rather than a closing stock balance.

Quantities are summarized per unit. Unknown-unit records remain in the ledger
and are flagged in Data notes, but are excluded from quantity summaries. Movement
values consistently use current NDP, excluding missing units/prices; invoice
sales amounts are not substituted. Location net values retain their sign.
Most Active Parts ranks transaction count, avoiding comparisons of litres with
pieces. Card definitions and full unit breakdowns open on click.

Undated records stay undated and appear only in All Time. Future records are
flagged and excluded. Refresh reads database data; Export uses filtered records.
Manual saves reload the authoritative ledger and recalculate views without
synthetic consumption rows or optimistic stock edits. OUT cannot consume reserved
stock. Bulk validation tracks sequential available balances. Entries older than
a location/part snapshot are history only; a new receipt for a part absent from a
known location's stock export can apply after that location's snapshot.

Validation includes movement math regressions and a browser check of all recorded
rows, card definitions, IN/OUT/date filters, filtered exports, single and bulk
saves, and rejected-save recovery. Browser writes use an in-memory database stub.
