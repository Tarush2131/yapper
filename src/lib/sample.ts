/** Ships with a table and a code block so the literal-content rules are visible on the first run. */
export const SAMPLE_MARKDOWN = `# Why your battery dies in winter

Lithium-ion cells don't actually *lose* charge in the cold. They lose access to it.

Inside every cell, lithium ions shuttle between two electrodes through a liquid
electrolyte. Cold thickens that liquid. The ions move slower, internal resistance
climbs, and the voltage sags under load until your phone decides it's empty — with
a third of its energy still sitting there, unreachable.

## What the numbers look like

| Temperature | Usable capacity | Charge rate | Permanent damage |
| ----------- | --------------- | ----------- | ---------------- |
| 25 °C       | 100%            | 1.0C        | none             |
| 0 °C        | 80%             | 0.3C        | none             |
| -10 °C      | 60%             | 0.1C        | minor            |
| -20 °C      | 45%             | blocked     | severe if forced |

The damage column is the one that matters. Discharging cold is inconvenient;
*charging* cold is destructive. Below freezing, lithium plates onto the anode as
metal instead of intercalating into it, and that metal never comes back.

## What good firmware does about it

> The fix isn't a better battery. It's a thermometer and some patience.

Most well-built devices refuse to fast-charge until the pack warms up:

\`\`\`python
def charge_current(temp_c, pack):
    if temp_c < 0:
        return 0.0            # plating risk — refuse outright
    if temp_c < 10:
        return pack.max * 0.1  # trickle only, let waste heat do the work
    if temp_c > 45:
        return pack.max * 0.5
    return pack.max
\`\`\`

That trickle isn't a compromise. It's the warm-up: the cell's own internal
resistance turns the small current into heat, and within twenty minutes the pack
is warm enough to take a real charge.

## The practical version

- Keep the device against your body, not in an outer pocket
- Let a cold phone reach room temperature before you plug it in
- Expect the percentage to jump once it warms — that reading was never a lie,
  just a measurement of what was reachable at the time
`
