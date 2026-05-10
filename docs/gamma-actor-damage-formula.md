# GAMMA 0.9.5 — Actor (player) damage formula

How GAMMA 0.9.5 computes bullet damage taken by the player. Useful for any
"effective mitigation" UI (e.g. an outfit breakpoint table against HP / FMJ / AP
rounds) and for any future damage-simulator extensions that target the player
rather than an NPC.

The existing `site/js/damage-calc.js` only models the **NPC-as-target** path
(GBOOBS / `grok_bo.script`). The player-as-target path lives in a different mod
and uses a different formula — the one documented here.

## Source files (in the GAMMA modpack, not in this repo)

Located under `<gamma>/mods/G.A.M.M.A. Actor Damage Balancer/`:

- `gamedata/scripts/grok_actor_damage_balancer.script` — damage callback, the
  authoritative formula. The `actor_on_before_hit` callback is registered at
  line ~1070; the actual armor math runs in `get_protection()` (line ~361) and
  the final damage line is **726**.
- `gamedata/configs/mod_system_items_armors_br_class_rework.ltx` — per-outfit
  `hit_fraction_actor` and `br_class` values, plus a header comment listing the
  canonical BRC breakpoints (reproduced below).
- `gamedata/configs/mod_system_items_defensive_boosts_rebalance.ltx` — drug
  booster `boost_fire_wound_immunity` / `boost_wound_immunity` values.

The companion `181- Ballistics Overhaul (GBOOBS) - Grokitach/gamedata/scripts/grok_bo.script`
only handles the **shooter = actor → target = NPC** direction; it does not
participate in calculating damage taken by the player.

## BRC breakpoints (ammo k_ap thresholds)

From the header comment of `mod_system_items_armors_br_class_rework.ltx`:

```
0.17  PISTOL FMJ           0.45  SNIPER UP + AP SLUG
0.23  SLUGS                0.49  5.45 AP
0.27  RIFLE FMJ            0.52  5.56 AP
0.33  SNIPER FMJ           0.57  7.62x39 AP
0.38  PISTOL AP            0.62  7.62x51 AP
                           0.80  7.62x54r AP
```

Each outfit's `br_class` is set to one of these tiers (Nosorog 0.17, generic Exo
0.265, etc.). Outfits also carry a matching `hit_fraction_actor` field.

## The formula

For a `fire_wound` (bullet) hit, the final damage applied to the player is
(grok_actor_damage_balancer.script:726):

```
damage = shit.power
       * (1 - premitigation)
       * (1 - player_protection)
```

Where `shit.power` has already been multiplied by `0.8` for `fire_wound`
(line 708) before this line runs.

### `player_protection` — the BR% bucket

Sum of:

- **Outfit BR%** — for body shots, `c_outfit:GetBoneArmor(bip01_spine) * cond * 0.80`.
  For non-FireWound damage types this is `GetDefHitTypeProtection(...)` instead.
- **Helmet BR%** — same, only counted on head shots.
- **Artefact protection** — for each belt artefact:
  `SYS_GetParam(immunity_sect, fire_wound_immunity) * cond * 0.6 * 0.80`,
  summed across the belt.
- **Booster protection** — active drug boost (`fire_wound_immunity`).

Capped at `limiter` = `0.65 + Σ(artefact fire_wound_cap)`, hard-capped at **0.90**.

### `premitigation` — the BRC bucket

For `fire_wound` only. Default `0`, set to `0.40 + Σ(plate premitigation bonus)`
**iff the bullet doesn't penetrate** (lines 482–507). Hard-capped at **0.90**.

The penetration test:

```
armor_bone_value = (1 - hit_fraction_actor) * cond + Σ artefacts_ap_res
            -- (helmet_bone_value on head shots, armor_bone_value on body shots)

if armor_bone_value >= k_ap:        -- bullet stopped
    premitigation = 0.40 + Σ plate premitigation
else:                                -- bullet penetrates
    premitigation = 0
```

`k_ap` is the bullet's `k_ap` from the ammo LTX. `hit_fraction_actor` is the
outfit/helmet's value from `mod_system_items_armors_br_class_rework.ltx`. Belt
ballistic plates contribute additive BRC via the `mitigation_table_body` /
`mitigation_table_head` tables in the script.

### Net mitigation per cell

For a "% damage taken" breakpoint table:

- **Pen** (BRC < bullet k_ap):           `damage_taken = 1 - BR%`
- **No-pen** (BRC ≥ bullet k_ap):        `damage_taken = (1 - 0.40) * (1 - BR%) = 0.60 * (1 - BR%)`

So a no-pen always reduces the damage by an extra flat 40% on top of BR%. This
is the "two defense buckets" the 0.9.5 release notes describe.

## Caveats for any UI built on this

1. **Headshots use the helmet split**, not the outfit. Body-shot is the natural
   default for an outfit-detail table.
2. The numbers in `outfits.json` (e.g. `ui_inv_outfit_fire_wound_protection` =
   `"56%"`) are the in-game **display strings**. The real LTX
   `fire_wound_protection` is e.g. `0.52` (see `G.A.M.M.A. Armors Balancing/`),
   and `GetBoneArmor(spine)` returns the per-bone protection from the
   `bones_koeff_protection` reference, not the flat field. If a breakpoint table
   needs to be exact, `scripts/generate-index.mjs` should be extended to emit
   `hit_fraction_actor`, `br_class`, and the raw `fire_wound_protection` /
   `wound_protection` numerics from the source LTX.
3. `cond` (item condition) and `* 0.80` adjuster both scale BR% in-game. A
   static "100% condition" table is the sane default for a database UI.
4. Belt artefacts and drug boosters can move both buckets meaningfully. A
   per-armor table can't reflect a player's actual loadout — that's a job for a
   player-target mode of `DamageSimulator.vue`.
