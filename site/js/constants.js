// ─── All app-wide constants ───────────────────────────────────────────────────

export const EFFECT_FIELDS = new Set([
    "st_prop_restore_health", "st_prop_restore_bleeding", "st_data_export_restore_radiation", "ui_inv_outfit_power_restore",
    "st_data_export_eat_health_change", "st_itm_desc_eat_sleepiness", "st_itm_desc_eat_thirst", "st_data_export_eat_alcohol", "ui_inv_satiety",
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection", "ui_inv_outfit_shock_protection", "ui_inv_outfit_chemical_burn_protection",
    "ui_inv_outfit_radiation_protection", "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection", "ui_inv_outfit_explosion_protection",
    "ui_inv_outfit_durability_physical", "ui_inv_outfit_durability_anomaly",
]);

export const FILTER_DEFS = [
    { key: "ui_mm_repair", type: "discrete", label: "app_filter_repair_type", values: ["A", "B", "C", "D", "E", "F", "H", "L", "M"] },
    { key: "ui_ammo_types", type: "discrete", label: "app_filter_ammo_type", dynamic: true },
    { key: "st_data_export_single_handed", type: "discrete", label: "app_filter_hands", values: ["Y", "N"], displayMap: { Y: "1H", N: "2H" } },
    { key: "ui_st_community", type: "discrete", label: "app_filter_faction", dynamic: true },
    { key: "pda_encyclopedia_tier", type: "discrete", label: "app_filter_tier", dynamic: true },
    { key: "st_data_export_can_be_crafted", type: "flag", label: "app_filter_craftable" },
    { key: "st_data_export_used_in_crafting", type: "flag", label: "app_filter_craft_material" },
    { key: "st_data_export_has_perk", type: "flag", label: "app_filter_has_perk" },
    { key: "st_data_export_is_junk", type: "flag", label: "app_filter_is_junk" },
    { key: "st_data_export_cuts_thick_skin", type: "flag", label: "app_filter_cuts_thick_skin" },
    { key: "ui_mcm_menu_exo", type: "flag", label: "app_filter_powered_exo" },
    { key: "st_data_export_can_be_cooked", type: "flag", label: "app_filter_cookable" },
    { key: "st_data_export_used_in_cooking", type: "flag", label: "app_filter_ingredient" },
    { key: "Type", type: "discrete", label: "app_filter_weapon_type", dynamic: true },
    { key: "factions", type: "discrete", label: "app_filter_origin", values: ["nato", "wp", "other"], displayMap: { nato: "NATO", wp: "WP", other: "Other" }, arrayField: true },
    { key: "_effects", type: "has-effect", label: "app_filter_provides_effect", fields: EFFECT_FIELDS },
    { key: "_has_launcher", type: "flag", label: "app_filter_has_launcher" },
];

export const NAME_TAG_COLS = new Set(["st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin"]);
export const BADGE_COLS = new Set(["Type", "ui_mm_repair", "ui_ammo_types", "st_data_export_ammo_types_alt", "st_data_export_single_handed", ...NAME_TAG_COLS]);
export const MODAL_BADGE_KEYS = new Set(["st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin", "ui_ammo_types", "st_data_export_ammo_types_alt", "ui_st_community", "factions"]);
export const SKIP_KEYS = new Set(["id", "pda_encyclopedia_name", "hasNpcWeaponDrop", "hasStashDrop", "inStartingLoadout", "unobtainable", "hasDisassemble", "st_data_export_description"]);
export const MAX_PINS = 5;
export const BUILD_HASH_PREFIX = "build/";

export const LOWER_IS_BETTER = new Set(["st_data_export_weapon_degradation"]);
export const HIGHER_IS_WORSE = new Set(["st_prop_weight", "st_upgr_cost", "_cost_per_round", "_malfunction_chance"]);
export const NO_HIGHLIGHT = new Set(["ui_ammo_types", "st_data_export_ammo_types_alt", "ui_mm_repair", "_compatible_weapons"]);
export const BIPOLAR = new Set([
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection", "ui_inv_outfit_shock_protection",
    "ui_inv_outfit_chemical_burn_protection", "ui_inv_outfit_radiation_protection", "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection",
    "ui_inv_outfit_explosion_protection", "st_prop_restore_health", "st_prop_restore_bleeding",
    "ui_inv_outfit_power_restore", "st_data_export_eat_health_change", "st_data_export_jump_height",
    "st_itm_desc_eat_sleepiness", "st_itm_desc_eat_thirst", "st_data_export_eat_alcohol", "ui_inv_satiety",
    "ui_inv_outfit_durability_physical", "ui_inv_outfit_durability_anomaly"
]);
export const POSITIVE_IS_GOOD = new Set([
    "ui_inv_accuracy", "ui_inv_handling", "ui_inv_reli",
]);

export const HEAL_GROUPS = [
    { label: "app_heal_post", fields: ["st_data_export_post_heal_head", "st_data_export_post_heal_torso", "st_data_export_post_heal_arm", "st_data_export_post_heal_leg"], abbr: ["H", "T", "A", "L"] },
    { label: "app_heal_first_aid", fields: ["st_data_export_first_aid_head", "st_data_export_first_aid_torso", "st_data_export_first_aid_arm", "st_data_export_first_aid_leg"], abbr: ["H", "T", "A", "L"] },
];
export const HEAL_FIELDS = new Set(HEAL_GROUPS.flatMap(g => g.fields));
export const RANGE_EXCLUDE = new Set([
    ...SKIP_KEYS, ...NAME_TAG_COLS, ...HEAL_FIELDS, ...BADGE_COLS,
    "name", "displayName", "ui_st_community",
]);
export const TILE_HIDE = new Set(["st_upgr_cost", "pda_encyclopedia_name", "name", "pda_encyclopedia_tier", "ui_st_rank", "Type", "factions", "st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_is_backpack", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin", "st_data_export_restore_health_max", "st_data_export_restore_bleeding_max", "st_data_export_restore_radiation_max", "st_data_export_power_restore_max", "st_data_export_description", ...HEAL_FIELDS]);

export const UNITS = {
    "st_prop_weight": "unit_kg",
    "st_upgr_cost": "₽",
    "ui_inv_wrange": "unit_m",
    "ui_inv_bspeed": "unit_m_per_s",
    "ui_inv_rate_of_fire": "unit_rpm",
    "ui_inv_radiation": "unit_msv_per_s",
    "st_data_export_restore_radiation": "unit_msv_per_s",
    "st_data_export_restore_radiation_max": "unit_msv",
    "st_data_export_limb_duration": "unit_s",
};

export const PROTECTION_FIELDS = [
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection",
    "ui_inv_outfit_shock_protection", "ui_inv_outfit_chemical_burn_protection", "ui_inv_outfit_radiation_protection",
    "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection", "ui_inv_outfit_explosion_protection",
    "ui_inv_outfit_durability_physical", "ui_inv_outfit_durability_anomaly",
];
export const RESTORATION_FIELDS = [
    "st_prop_restore_health", "st_prop_restore_bleeding", "st_data_export_restore_radiation", "ui_inv_outfit_power_restore",
];
export const BASE_RESIST_CAP = 65;
export const CAP_FIELD_MAP = {
    "ui_inv_outfit_fire_wound_protection": "gamma_fire_wound_cap",
    "ui_inv_outfit_wound_protection": "gamma_wound_cap",
    "ui_inv_outfit_burn_protection": "gamma_burn_cap",
    "ui_inv_outfit_shock_protection": "gamma_shock_cap",
    "ui_inv_outfit_chemical_burn_protection": "gamma_chemical_burn_cap",
    "ui_inv_outfit_telepatic_protection": "gamma_telepatic_cap",
    "ui_inv_outfit_strike_protection": "gamma_strike_cap",
    "ui_inv_outfit_explosion_protection": "gamma_explosion_cap",
};

export const CAT = {
    FAVORITES: "Favorites", ALL_WEAPONS: "All Weapons",
    PISTOLS: "Pistols", SMGS: "SMGs", SHOTGUNS: "Shotguns",
    RIFLES: "Rifles", SNIPERS: "Snipers", LAUNCHERS: "Launchers", MELEE: "Melee",
    SCOPES: "Scopes", SILENCERS: "Silencers", GRENADE_LAUNCHERS: "Grenade Launchers", TACTICAL_KITS: "Tactical Kits",
    AMMO: "Ammo", EXPLOSIVES: "Explosives",
    OUTFITS: "Outfits", HELMETS: "Helmets", BELT_ATTACHMENTS: "Belt Attachments",
    OUTFIT_EXCHANGE: "Outfit Exchange", ARTEFACTS: "Artefacts",
    FOOD: "Food", MEDICINE: "Medicine",
    CRAFTING: "Crafting", MATERIALS: "Materials",
    MUTANT_PARTS: "Mutant Parts", RECIPES: "Recipes",
    TOOLKIT_RATES: "Toolkit Rates",
};

export const CRAFTING_SUBCATEGORIES = new Set([
    "all", "device", "equipment", "repair", "upgrades",
    "medical", "ammo", "artefact", "furniture", "decoration", "materials",
]);

export const BUILD_SLOT_CATEGORIES = { outfit: CAT.OUTFITS, helmet: CAT.HELMETS, belt: CAT.BELT_ATTACHMENTS, artifact: CAT.ARTEFACTS, backpack: CAT.BELT_ATTACHMENTS };
export function isBackpack(item) { return item?.st_data_export_is_backpack === "Y"; }
export const MAX_SAVED_BUILDS = 10;

export const WEAPON_STAT_FIELDS = [
    "ui_inv_accuracy", "ui_inv_handling", "ui_inv_damage",
    "ui_inv_rate_of_fire", "ui_ammo_count", "ui_inv_wrange",
    "ui_inv_bspeed", "ui_inv_reli", "ui_inv_recoil",
];
export const AMMO_MULTIPLIER_FIELDS = new Set(["ui_inv_damage", "ui_inv_accuracy", "ui_inv_wrange", "ui_inv_bspeed"]);
// Packs that mirror GAMMA 0.9.5+ UI removal of gun-level Damage and Max Range stats
export const PACKS_HIDE_GUN_DAMAGE_RANGE = new Set(["gamma-0.9.5"]);
export const HIDDEN_GUN_DAMAGE_RANGE_FIELDS = new Set(["ui_inv_damage", "ui_inv_wrange"]);
export const AMMO_ONLY_FIELDS = ["st_data_export_ap", "st_data_export_projectiles", "st_data_export_falloff", "st_data_export_impulse", "st_data_export_weapon_degradation"];
export const GRENADE_STAT_FIELDS = ["st_data_export_blast_power", "st_detonation_radius", "st_data_export_fragments", "st_data_fragment_damage", "st_detonation_time"];
export const PRIMARY_WEAPON_SLUGS = ["rifles", "shotguns", "smgs", "snipers", "launchers"];
export const SIDEARM_SLUGS = ["pistols", "melee"];
export const GRENADE_SLUG = "explosives";
export const SLOT_COLORS = { outfit: "#5b8abd", helmet: "#5ba8a0", backpack: "#6bab5b", belt: "#c89050", artifact: "#9b6fb0", weapon: "#b85c5c", sidearm: "#b85c5c", grenade: "#7a6e50", ammo: "#8b8b5e" };

export const LOCALES = [{id:"en",label:"English"},{id:"ru",label:"Русский"},{id:"fr",label:"Français"}];
export const CHART_COLORS = ["#c8a84e", "#5b8abd", "#b85c5c", "#5ba8a0", "#9b6fb0"];

export const SINGULAR_TYPE = { [CAT.PISTOLS]: "app_type_pistol", [CAT.SMGS]: "app_type_smg", [CAT.SHOTGUNS]: "app_type_shotgun", [CAT.RIFLES]: "app_type_rifle", [CAT.SNIPERS]: "app_type_sniper", [CAT.LAUNCHERS]: "app_type_launcher", [CAT.MELEE]: "app_cat_melee" };
export const SINGULAR_CATEGORY = { ...SINGULAR_TYPE, [CAT.OUTFITS]: "app_type_outfit", [CAT.HELMETS]: "app_type_helmet", [CAT.BELT_ATTACHMENTS]: "app_type_belt_attachment", [CAT.EXPLOSIVES]: "app_type_explosive", [CAT.ARTEFACTS]: "app_type_artefact", [CAT.MUTANT_PARTS]: "app_type_mutant_part" };

export const CATEGORY_KEYS = {
    [CAT.FAVORITES]: "app_cat_favorites", [CAT.ALL_WEAPONS]: "app_cat_all_weapons",
    [CAT.PISTOLS]: "app_cat_pistols", [CAT.SMGS]: "app_cat_smgs", [CAT.SHOTGUNS]: "app_cat_shotguns",
    [CAT.RIFLES]: "app_cat_rifles", [CAT.SNIPERS]: "app_cat_snipers", [CAT.LAUNCHERS]: "app_cat_launchers",
    [CAT.MELEE]: "app_cat_melee",
    [CAT.SCOPES]: "app_cat_scopes", [CAT.SILENCERS]: "app_cat_silencers", [CAT.GRENADE_LAUNCHERS]: "app_cat_grenade_launchers", [CAT.TACTICAL_KITS]: "app_cat_tactical_kits",
    [CAT.AMMO]: "app_cat_ammo", [CAT.EXPLOSIVES]: "app_cat_explosives",
    [CAT.OUTFITS]: "app_cat_outfits", [CAT.HELMETS]: "app_cat_helmets",
    [CAT.BELT_ATTACHMENTS]: "app_cat_belt_attachments", [CAT.OUTFIT_EXCHANGE]: "app_cat_outfit_exchange",
    [CAT.FOOD]: "app_cat_food", [CAT.MEDICINE]: "app_cat_medicine", [CAT.ARTEFACTS]: "app_cat_artefacts",
    [CAT.CRAFTING]: "app_cat_crafting", [CAT.MATERIALS]: "app_cat_materials",
    [CAT.MUTANT_PARTS]: "app_cat_mutant_parts", [CAT.RECIPES]: "app_cat_recipes",
    [CAT.TOOLKIT_RATES]: "app_cat_toolkit_rates",
};
export const WEAPON_CATEGORIES = [CAT.PISTOLS, CAT.SMGS, CAT.SHOTGUNS, CAT.RIFLES, CAT.SNIPERS, CAT.LAUNCHERS, CAT.MELEE];
export const WEAPON_CATEGORY_SLUGS = WEAPON_CATEGORIES.map(c => c.toLowerCase().replace(/ /g, "-"));
export const VIRTUAL_CATEGORIES = new Set([CAT.ALL_WEAPONS, CAT.CRAFTING, CAT.TOOLKIT_RATES, CAT.SCOPES, CAT.SILENCERS, CAT.GRENADE_LAUNCHERS, CAT.TACTICAL_KITS]);

export const CATEGORY_GROUPS = [
    { name: "app_group_weapons", categories: [CAT.ALL_WEAPONS, ...WEAPON_CATEGORIES] },
    { name: "app_group_attachments", categories: [CAT.SCOPES, CAT.SILENCERS, CAT.GRENADE_LAUNCHERS, CAT.TACTICAL_KITS] },
    { name: "app_group_ammo_explosives", categories: [CAT.AMMO, CAT.EXPLOSIVES] },
    { name: "app_group_equipment", categories: [CAT.OUTFITS, CAT.HELMETS, CAT.BELT_ATTACHMENTS, CAT.ARTEFACTS, CAT.OUTFIT_EXCHANGE] },
    { name: "app_group_consumables", categories: [CAT.FOOD, CAT.MEDICINE] },
    { name: "app_group_crafting", categories: [CAT.MUTANT_PARTS] },
];

export const KEYS = {
    SEARCH: ['/', 's'],
    ESCAPE: 'Escape',
    TOGGLE_VIEW: 'v',
    TOGGLE_SIDEBAR: 'b',
    COMPARE: 'c',
    HELP: '?',
    FILTERS: 'F',
    PREV_CATEGORY: ['[', ',', 'h'],
    NEXT_CATEGORY: [']', '.', 'l'],
    FAVORITE: 'f',
    PIN: 'p',
    PREV_ITEM: ['ArrowLeft', 'h'],
    NEXT_ITEM: ['ArrowRight', 'l'],
    CLEAR_FILTERS: 'x',
    CHORD_GO: 'g',
    CHORD_BUILD: 'b',
    QUICK_NAV: 'k',
};

export const matchesKey = (key, binding) =>
    Array.isArray(binding) ? binding.includes(key) : key === binding;
export const CHORD_TIMEOUT = 500;

export const FACTION_ICONS = {
    "bandit": "faction_bandits.png",
    "csky": "faction_clearsky.png",
    "dolg": "faction_duty.png",
    "duty": "faction_duty.png",
    "ecolog": "faction_ecologists.png",
    "stalker": "faction_loners.png",
    "freedom": "faction_freedom.png",
    "killer": "faction_mercenary.png",
    "merc": "faction_mercenary.png",
    "army": "faction_military.png",
    "monolith": "faction_monolith.png",
    "renegade": "faction_renegades.png",
    "greh": "faction_sin.png",
    "isg": "faction_inisig.png",
    "zombied": "faction_zombie.svg",
};

export const FACTION_COLORS = {
    "bandit": "#b5a068",
    "csky": "#5ba4cf",
    "dolg": "#c47060",
    "ecolog": "#7fbf5f",
    "stalker": "#d4a843",
    "freedom": "#5fbf5f",
    "killer": "#4a90d9",
    "army": "#6b8e5a",
    "monolith": "#a080c0",
    "renegade": "#c87840",
    "greh": "#8b4a8b",
    "isg": "#7a8b6a",
    "st_data_export_unknown": "#b0b0b0",
};

export const FACTION_LIST = ["stalker", "dolg", "freedom", "csky", "ecolog", "army", "killer", "bandit", "monolith", "renegade", "greh", "isg"];

