// Pure damage calculation functions matching GAMMA's grok_bo.script v1.6.6
// No Vue dependencies — all functions take plain data objects.

/**
 * Barrel condition correction formula (grok_bo line 370).
 * @param {number} conditionPct - barrel condition 0-100 (percent)
 * @returns {number} corrected multiplier, clamped to max 1.0
 */
export function barrelConditionCorrected(conditionPct) {
  const cond = conditionPct / 100;
  const result = (130 - 1.12 * cond) * (cond * 1.12) / 100;
  return Math.min(result, 1);
}

/**
 * Air resistance / distance falloff divisor.
 * @param {number} distance - metres
 * @param {number} kAirRes - ammo k_air_resistance value
 * @returns {number} divisor (>=1) to divide damage/AP by
 */
export function airResDivisor(distance, kAirRes) {
  return 1 + distance / 200 * (kAirRes * 0.5 / (1 - kAirRes + 0.1));
}

/**
 * Strip _bad/_verybad suffixes from ammo IDs for GBO constant lookups.
 */
function normalizeAmmoId(ammoId) {
  return ammoId.replace(/_(?:very)?bad$/, "");
}

/**
 * Check if an ammo ID is in the buckshot list.
 */
function isBuckshot(ammoId, gbo) {
  return gbo.buckshot_ammo.includes(normalizeAmmoId(ammoId));
}

/**
 * Check if a weapon is a sniper for leg-meta and AP boost purposes.
 */
function isSniper(weaponId, gbo) {
  return gbo.snipers.includes(weaponId);
}

/**
 * Check if a weapon has an integrated silencer.
 */
export function hasIntegratedSilencer(weaponId, gbo) {
  return gbo.integrated_silencer.includes(weaponId);
}

/**
 * Resolve the ammo damage multiplier for mutant targets.
 * For pseudogiants, uses the special pseudogiant table.
 */
export function resolveMutantAmmoMult(ammoId, mutantType, gbo) {
  const norm = normalizeAmmoId(ammoId);
  if (mutantType === "gigant") {
    if (gbo.pseudogiant_ammo_mult[norm] !== undefined) {
      return gbo.pseudogiant_ammo_mult[norm];
    }
  }
  if (gbo.mutant_ammo_mult.overrides[norm] !== undefined) {
    return gbo.mutant_ammo_mult.overrides[norm];
  }
  return gbo.mutant_ammo_mult.default;
}

/**
 * Resolve the ammo damage multiplier for stalker targets.
 */
export function resolveStalkerAmmoMult(ammoId, gbo) {
  const norm = normalizeAmmoId(ammoId);
  if (gbo.stalker_ammo_mult.overrides[norm] !== undefined) {
    return gbo.stalker_ammo_mult.overrides[norm];
  }
  return gbo.stalker_ammo_mult.default;
}

/**
 * Resolve spec_monster_mult and crit data for a mutant type.
 * @param {string} mutantId - the mutant section ID (e.g. "m_gigant_e")
 * @returns {{ mult: number, critMult?: number }}
 */
export function resolveSpecMonsterMult(mutantId, gbo) {
  for (const [key, data] of Object.entries(gbo.spec_monster_mult)) {
    if (mutantId.includes(key)) {
      return data;
    }
  }
  return { mult: 1.0 };
}

/**
 * Resolve the hp_no_penetration_penalty for a given ammo type.
 */
export function resolveHpNoPenPenalty(ammoId, gbo) {
  const norm = normalizeAmmoId(ammoId);
  return gbo.hp_no_penetration_penalty[norm] || 1;
}

/**
 * Resolve faction damage and AP resistance.
 * @returns {{ dmg_res: number, ap_res: number }}
 */
export function resolveFactionRes(faction, gbo) {
  return gbo.faction_resistance[faction] || { dmg_res: 1.0, ap_res: 1.0 };
}

/**
 * Get the stalker bone damage multiplier for a hitzone.
 * @param {string} hitzone - "head", "neck", "jaw", "torso", "arms", "legs"
 * @param {object} gbo
 * @returns {number}
 */
export function stalkerBoneDamageMult(hitzone, gbo) {
  const zone = gbo.stalker_hitzones[hitzone];
  if (!zone) return 0.75;
  const bone = zone.default_bone;
  return gbo.stalker_bone_damage[bone] || 0.75;
}

/**
 * Determine which armor group a stalker hitzone uses (head or body).
 * @returns {"head"|"body"}
 */
export function stalkerArmorGroup(hitzone) {
  if (hitzone === "head" || hitzone === "neck" || hitzone === "jaw") return "head";
  return "body";
}

// ──────────────────────────────────────────
// MUTANT DAMAGE
// ──────────────────────────────────────────

/**
 * Calculate damage against a mutant target.
 *
 * Order of operations matches what happens in-game:
 *   1. Raw damage = hit_power * k_hit * pellets
 *   2. Distance falloff via k_air_resistance
 *   3. Engine-side mutant armor (xray base_monster.cpp:449-468):
 *        if ap > skin_armor: damage *= max((ap - skin_armor)/ap, hit_fraction)
 *        else:               damage *= hit_fraction
 *      ap is the raw ammo k_ap (NOT the *10 form grok_bo uses for NPC AP).
 *   4. grok_bo modifiers (mutant_on_before_hit line 495):
 *        * mutant_mult * ammo_mult * spec_monster_mult * bone_mult * cqc * barrel * difficulty
 *   5. Final damage subtracted from 1.0 normalised HP (engine clamps all entities to MAX_HEALTH=1.0).
 *
 * @param {object} params
 * @param {number} params.hitPower - weapon hit_power
 * @param {number} params.kHit - ammo k_hit
 * @param {number} params.kAp - ammo k_ap (raw, used for engine pen check)
 * @param {number} params.pellets - ammo projectile count
 * @param {number} params.kAirRes - ammo k_air_resistance
 * @param {number} params.distance - metres
 * @param {number} params.barrelCond - barrel condition 0-100
 * @param {number} params.difficulty - difficulty key (1-4)
 * @param {string} params.ammoId - ammo section ID
 * @param {string} params.mutantId - mutant section ID
 * @param {string} params.hitzone - "head", "torso", "limbs", "rear"
 * @param {object} params.mutantProfile - mutant profile from JSON (skin_armor, hit_fraction, hitzone_*)
 * @param {object} params.gbo - GBO constants
 * @param {boolean} [params.isCqc=false] - melee weapon hit
 */
export function calcMutantDamage(params) {
  const { hitPower, kHit, kAp = 0, pellets, kAirRes, distance, barrelCond, difficulty,
          ammoId, mutantId, hitzone, mutantProfile, gbo, isCqc = false } = params;

  const rawDmg = hitPower * kHit * pellets;
  const airDiv = airResDivisor(distance, kAirRes);
  const barrel = barrelConditionCorrected(barrelCond);
  const diffMult = gbo.difficulty[String(difficulty)] || 1;
  const mutantMult = gbo.mutant_mult_default;
  const ammoMult = resolveMutantAmmoMult(ammoId, getMutantType(mutantId), gbo);
  const specData = resolveSpecMonsterMult(mutantId, gbo);
  const specMult = specData.mult;
  const cqcMult = isCqc ? 1.5 : 1;

  const hitzoneKey = "hitzone_" + hitzone;
  const boneMult = mutantProfile[hitzoneKey] || 1;

  // Crit: in the sim we check if the hitzone matches a known crit zone for this mutant
  let critMult = 1;
  if (specData.crit_mult && hitzone === "head") {
    // Most mutant crits are on head-related bones; simplified for the sim UI
    critMult = specData.crit_mult;
  }

  const finalBoneMult = boneMult * critMult;

  // Engine-side pen formula (base_monster.cpp:449-468). Falls back to hit_fraction floor.
  const skinArmor = mutantProfile.skin_armor || 0;
  const hitFraction = mutantProfile.hit_fraction || 0;
  let penMult;
  let penetrated;
  if (kAp > skinArmor) {
    penMult = Math.max((kAp - skinArmor) / kAp, hitFraction);
    penetrated = true;
  } else {
    penMult = hitFraction;
    penetrated = false;
  }

  const postEngine = (rawDmg / airDiv) * penMult;
  const damage = postEngine * mutantMult * ammoMult * specMult * finalBoneMult * cqcMult * barrel * diffMult;

  return {
    damage,
    boneMult,
    critMult,
    ammoMult,
    specMult,
    mutantMult,
    penMult,
    penetrated,
    ap: kAp,
    skinArmor,
    hitFraction,
    rawDmg,
    airDiv,
    barrel,
    diffMult,
  };
}

/**
 * Shots to kill a mutant. HP is universally 1.0 (engine clamps via MAX_HEALTH=1.0f),
 * mutant damage has no armor degradation between shots, so this is a simple division.
 */
export function mutantShotsToKill(damagePerShot) {
  if (!damagePerShot || damagePerShot <= 0) return Infinity;
  return Math.ceil(1.0 / damagePerShot);
}

// Known mutant species keywords. Sorted longest-first so prefix-overlapping
// species (psysucker vs bloodsucker, pseudodog vs dog, baba_yaga vs yaga)
// resolve to the more specific match.
export const MUTANT_SPECIES = [
  "psycontroller", "bibliotekar", "bloodsucker", "controller",
  "poltergeist", "tushkanchik", "baba_yaga", "pseudodog",
  "psysucker", "fracture", "chimera", "tushkano",
  "lurker", "gigant", "snork", "burer", "flesh",
  "zombie", "zombi", "karlik", "borya", "boar",
  "rat", "dog", "cat",
];

/**
 * Pick the most specific known species name for a mutant section id.
 * Returns null when no known species keyword is found.
 */
export function extractMutantSpecies(id) {
  for (const sp of MUTANT_SPECIES) {
    if (id.includes(sp)) return sp;
  }
  return null;
}

/**
 * Extract the mutant type key from a mutant section ID for GBO lookups.
 * E.g. "m_gigant_e" → "gigant", "agru_bloodsucker" → "bloodsucker"
 */
function getMutantType(mutantId) {
  for (const key of ["gigant", "chimera", "boar", "bloodsucker", "psysucker",
                      "flesh", "zombi", "snork", "lurker", "fracture"]) {
    if (mutantId.includes(key)) return key;
  }
  return null;
}

// ──────────────────────────────────────────
// STALKER AP
// ──────────────────────────────────────────

/**
 * Calculate effective AP against a stalker target.
 * @param {object} params
 * @param {number} params.kAp - ammo k_ap (raw, will be multiplied by 10)
 * @param {number} params.kAirRes - ammo k_air_resistance
 * @param {number} params.distance - metres
 * @param {number} params.barrelCond - barrel condition 0-100
 * @param {number} params.difficulty - difficulty key (1-4)
 * @param {number} params.apScale - NPC armor profile ap_scale
 * @param {string} params.ammoId - ammo section ID
 * @param {string} params.weaponId - weapon section ID
 * @param {string} params.hitzone - "head", "neck", "jaw", "torso", "arms", "legs"
 * @param {string} params.faction - faction string
 * @param {boolean} params.silenced - whether silencer is active
 * @param {object} params.gbo - GBO constants
 * @returns {number} effective AP value
 */
export function calcStalkerAP(params) {
  const { kAp, kAirRes, distance, barrelCond, difficulty, apScale,
          ammoId, weaponId, hitzone, faction, silenced, gbo } = params;

  const norm = normalizeAmmoId(ammoId);
  let ap = kAp * 10;

  // Hitzone-specific AP boosts
  const zone = gbo.stalker_hitzones[hitzone];
  const group = zone ? zone.group : "upper_body";
  const buck = isBuckshot(ammoId, gbo);
  const isLegMeta = gbo.leg_meta_null_ammo.includes(norm);

  if (group === "lower_body") {
    if (buck) {
      ap += gbo.ap_boost.legs_buckshot;
    } else if (!isLegMeta && !isSniper(weaponId, gbo)) {
      ap += gbo.ap_boost.legs;
    }
  }

  if (group === "head") {
    if (buck) {
      ap += gbo.ap_boost.head_buckshot;
    } else {
      ap += gbo.ap_boost.head;
    }
  }

  if (isSniper(weaponId, gbo)) {
    ap += gbo.ap_boost.sniper;
  }

  const barrel = barrelConditionCorrected(barrelCond);
  ap = ap * apScale * barrel;

  const airDiv = airResDivisor(distance, kAirRes);
  const factionRes = resolveFactionRes(faction, gbo);
  const silencerMult = silenced || hasIntegratedSilencer(weaponId, gbo) ? gbo.silencer_boost : 1;
  const diffMult = gbo.difficulty[String(difficulty)] || 1;

  ap = ap / airDiv * factionRes.ap_res * silencerMult * diffMult * 0.80;

  return ap;
}

// ──────────────────────────────────────────
// STALKER DAMAGE
// ──────────────────────────────────────────

/**
 * Calculate raw (pre-armor) damage against a stalker target.
 * @returns {number} raw damage before armor calculation
 */
export function calcStalkerRawDamage(params) {
  const { hitPower, kHit, pellets, kAirRes, distance, barrelCond, difficulty,
          ammoId, weaponId, hitzone, faction, silenced, apScale, gbo } = params;

  const airDiv = airResDivisor(distance, kAirRes);
  const barrel = barrelConditionCorrected(barrelCond);
  const boneDmgMult = stalkerBoneDamageMult(hitzone, gbo);
  const factionRes = resolveFactionRes(faction, gbo);
  const diffMult = gbo.difficulty[String(difficulty)] || 1;
  const ammoMult = resolveStalkerAmmoMult(ammoId, gbo);
  const silencerMult = silenced || hasIntegratedSilencer(weaponId, gbo) ? gbo.silencer_boost : 1;

  const damage = (hitPower / airDiv) * kHit * boneDmgMult * apScale * 1.1
    * barrel * factionRes.dmg_res * diffMult * ammoMult * silencerMult * pellets;

  return damage;
}

/**
 * Detailed stalker damage + AP calculation with breakdown factors.
 */
export function calcStalkerDetailed(params) {
  const { hitPower, kHit, kAp, pellets, kAirRes, distance, barrelCond, difficulty,
          ammoId, weaponId, hitzone, faction, silenced, apScale, gbo } = params;

  const norm = normalizeAmmoId(ammoId);
  const airDiv = airResDivisor(distance, kAirRes);
  const barrel = barrelConditionCorrected(barrelCond);
  const boneDmgMult = stalkerBoneDamageMult(hitzone, gbo);
  const factionRes = resolveFactionRes(faction, gbo);
  const diffMult = gbo.difficulty[String(difficulty)] || 1;
  const ammoMult = resolveStalkerAmmoMult(ammoId, gbo);
  const silencerMult = silenced || hasIntegratedSilencer(weaponId, gbo) ? gbo.silencer_boost : 1;

  const rawDmg = (hitPower / airDiv) * kHit * boneDmgMult * apScale * 1.1
    * barrel * factionRes.dmg_res * diffMult * ammoMult * silencerMult * pellets;

  // AP breakdown
  let ap = kAp * 10;
  const zone = gbo.stalker_hitzones[hitzone];
  const group = zone ? zone.group : "upper_body";
  const buck = isBuckshot(ammoId, gbo);
  let apBoost = 0;
  if (group === "lower_body") {
    if (buck) apBoost = gbo.ap_boost.legs_buckshot;
    else if (!gbo.leg_meta_null_ammo.includes(norm) && !isSniper(weaponId, gbo)) apBoost = gbo.ap_boost.legs;
  }
  if (group === "head") {
    apBoost = buck ? gbo.ap_boost.head_buckshot : gbo.ap_boost.head;
  }
  const sniperBoost = isSniper(weaponId, gbo) ? gbo.ap_boost.sniper : 0;
  ap += apBoost + sniperBoost;
  const apPreScale = ap;
  ap = ap * apScale * barrel;
  const apPostScale = ap;
  ap = ap / airDiv * factionRes.ap_res * silencerMult * diffMult * 0.80;

  return {
    rawDmg,
    ap,
    breakdown: {
      hitPower,
      kHit,
      pellets,
      boneDmgMult,
      apScale,
      barrel,
      airDiv,
      factionDmgRes: factionRes.dmg_res,
      factionApRes: factionRes.ap_res,
      diffMult,
      ammoMult,
      silencerMult,
      kAp: kAp * 10,
      apBoost,
      sniperBoost,
    },
  };
}

/**
 * Full stalker armor calculation.
 * Determines penetration status and final damage.
 *
 * @param {number} ap - effective AP (from calcStalkerAP)
 * @param {number} rawDmg - pre-armor damage (from calcStalkerRawDamage)
 * @param {number} boneArmor - bone armor value from NPC profile
 * @param {number} hitFraction - hit_fraction from NPC profile
 * @param {number} hpPenalty - hp_no_penetration_penalty from GBO
 * @returns {object} { penetrated: boolean, damage: number, minDamage?: number, maxDamage?: number, newArmor: number }
 */
export function stalkerArmorCalc(ap, rawDmg, boneArmor, hitFraction, hpPenalty) {
  const lossIncrement = ap * 0.6;
  const newArmor = boneArmor - lossIncrement;

  if (ap >= boneArmor) {
    // Full penetration — armor is not degraded
    return { penetrated: true, damage: rawDmg, newArmor: boneArmor };
  }

  // AP didn't exceed armor
  if (ap > newArmor) {
    // Bullet damaged armor enough, partial pen with reduced power
    return { penetrated: false, partialPen: true, damage: rawDmg * hitFraction, newArmor };
  }

  // No penetration — residual concussion damage
  // In-game: 0.0025 * dmg * hitFraction * random(25,100) / hpPenalty
  const minDmg = 0.0025 * rawDmg * hitFraction * 25 / hpPenalty;
  const avgDmg = 0.0025 * rawDmg * hitFraction * 62.5 / hpPenalty;
  const maxDmg = 0.0025 * rawDmg * hitFraction * 100 / hpPenalty;

  return {
    penetrated: false,
    partialPen: false,
    damage: avgDmg,
    minDamage: minDmg,
    maxDamage: maxDmg,
    newArmor,
  };
}

/**
 * Calculate how many shots are needed to penetrate armor.
 * Each non-pen shot degrades armor by (ap * 0.6).
 * @returns {number} shots to achieve first penetration (minimum 1)
 */
export function shotsToPen(ap, boneArmor) {
  if (ap >= boneArmor) return 1;
  const lossPerShot = ap * 0.6;
  if (lossPerShot <= 0) return Infinity;
  return Math.ceil((boneArmor - ap) / lossPerShot) + 1;
}

// ──────────────────────────────────────────
// SHOTS TO KILL (STALKER)
// ──────────────────────────────────────────

/**
 * Estimate shots to kill a stalker (HP = 1.0).
 * Accounts for armor degradation per shot.
 *
 * @param {object} params - all parameters needed for AP and damage calcs
 * @param {object} npcProfile - NPC armor profile
 * @param {object} gbo - GBO constants
 * @returns {{ stk: number, minStk: number, maxStk: number, shots: Array }}
 */
export function stalkerShotsToKill(params, npcProfile, gbo) {
  const hitzone = params.hitzone;
  const armorGroup = stalkerArmorGroup(hitzone);
  let boneArmor = armorGroup === "head" ? npcProfile.head_bonearmor : npcProfile.body_bonearmor;
  const hitFraction = npcProfile.hit_fraction;
  const apScale = npcProfile.ap_scale;
  const hpPenalty = resolveHpNoPenPenalty(params.ammoId, gbo);

  const ap = calcStalkerAP({ ...params, apScale, gbo });
  const rawDmg = calcStalkerRawDamage({ ...params, apScale, gbo });

  let hp = 1.0;
  let minHp = 1.0;
  let maxHp = 1.0;
  let shots = 0;
  const maxShots = 200;
  const shotLog = [];

  while (hp > 0 && shots < maxShots) {
    shots++;
    const result = stalkerArmorCalc(ap, rawDmg, boneArmor, hitFraction, hpPenalty);
    boneArmor = result.newArmor;

    hp -= result.damage;
    if (result.minDamage !== undefined) {
      minHp -= result.minDamage;
      maxHp -= result.maxDamage;
    } else {
      minHp -= result.damage;
      maxHp -= result.damage;
    }

    shotLog.push({
      shot: shots,
      penetrated: result.penetrated,
      partialPen: result.partialPen || false,
      damage: result.damage,
      remainingHp: hp,
      remainingArmor: boneArmor,
    });

    if (hp <= 0) break;
  }

  // Calculate min/max STK from accumulated min/max damage
  let minStk = shots;
  let maxStk = shots;
  if (shotLog.some(s => s.damage !== undefined && !s.penetrated && !s.partialPen)) {
    // Recalculate with max damage for min STK
    let mHp = 1.0;
    let mArmor = armorGroup === "head" ? npcProfile.head_bonearmor : npcProfile.body_bonearmor;
    minStk = 0;
    while (mHp > 0 && minStk < maxShots) {
      minStk++;
      const r = stalkerArmorCalc(ap, rawDmg, mArmor, hitFraction, hpPenalty);
      mArmor = r.newArmor;
      mHp -= (r.maxDamage !== undefined ? r.maxDamage : r.damage);
    }
    // Recalculate with min damage for max STK
    mHp = 1.0;
    mArmor = armorGroup === "head" ? npcProfile.head_bonearmor : npcProfile.body_bonearmor;
    maxStk = 0;
    while (mHp > 0 && maxStk < maxShots) {
      maxStk++;
      const r = stalkerArmorCalc(ap, rawDmg, mArmor, hitFraction, hpPenalty);
      mArmor = r.newArmor;
      mHp -= (r.minDamage !== undefined ? r.minDamage : r.damage);
    }
  }

  return { stk: shots, minStk, maxStk, shotLog, ap, rawDmg };
}
