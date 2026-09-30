# Fish-plugin Balance Formula

This is the shared coin-equivalent model for health-related effects and random fishing rewards. The helpers live in `lib/value-formula.js`; `lib/balance-audit.js` recomputes the current health-point rate from the fish pools so tests catch drift when the fishing economy changes.

## Health Point Value

Use the default deep-sea setup as the reference: base catch rate, the current rarity weights, average fish value within each rarity, the ordinary deep-sea fishball rate, and the base health cost per cast.

```text
expected coins per cast
  = base catch rate
    * (weighted average sell value per catch
       + ordinary fishball rate * weighted average internal fish value)

coins per health point
  = expected coins per cast / base health cost per cast * safety factor
```

The 0.75 safety factor discounts for fishing variance, time, and fish that are collected rather than sold. With the current pools this rounds to `2.42` fish eggs per health point. Keep `HEALTH_POINT_COIN_VALUE` in `lib/value-formula.js` synchronized with `deriveHealthPointCoinValue()`; `scripts/test-health-value-formula.js` enforces that.

Health limits are valued at `440` for static percentage-potion lottery estimates: base 200 + 10 tank levels * 20 + 8 harbor levels * 5. Actual percentage-potion healing still uses the player's current health limit and is capped by missing health when applied.

## Reusable Conversions

- Fish eggs: face value, one egg equals one coin-equivalent.
- Health: `health points * 2.42`, rounded to the nearest fish egg.
- Bait: `units * pack price / pack size`; use actual lottery value instead where the game deliberately assigns a promotional value.
- Percentage potion: restore percent * reference/current health limit * health-point value.
- Random outcomes: `sum(probability * outcome coin-equivalent)`; probabilities may be weights and are normalized by the helper.

`getFishingOutcomeFishEggValue()` and `getExpectedFishingOutcomeFishEggValue()` implement the shared conversions. For a new fishing item, estimate the marginal value relative to the baseline setup, then compare its expected coin gain with the expected health cost. Do not count both the fish's full value and the fishball payout as the same reward; the fishball is an additional fraction of internal value.

## Recent Calibration

- The six health potions use the same 2.42 rate; their listed lottery values are 85, 182, 315, 106, 266, and 479 eggs at the 440-point reference limit.
- `零点灯鱼` now costs 1 extra health point per cast and adds 0.09 fishball rate. At the baseline catch rate, the added fishball value is about 2.75 eggs per cast versus 2.42 eggs of health cost, making it a near-even risk/reward effect.
- Health on the player record is shared across groups. The health limit now retains the highest capacity reached so changing to a lower-level harbor cannot permanently erase current health.
