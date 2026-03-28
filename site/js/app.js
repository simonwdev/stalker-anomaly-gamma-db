import '../src/globals.js';

const EFFECT_FIELDS = new Set([
    "st_prop_restore_health", "st_prop_restore_bleeding", "st_data_export_restore_radiation", "ui_inv_outfit_power_restore",
    "st_data_export_eat_health_change", "st_itm_desc_eat_sleepiness", "st_itm_desc_eat_thirst", "st_data_export_eat_alcohol", "ui_inv_satiety",
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection", "ui_inv_outfit_shock_protection", "ui_inv_outfit_chemical_burn_protection",
    "ui_inv_outfit_radiation_protection", "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection", "ui_inv_outfit_explosion_protection",
]);


function malfunctionChance(reliabilityPct) {
    const condShotDec = 0.01 - (reliabilityPct / 10000);
    return (2 * condShotDec * 2000) / 10;
}

function isNonZero(val) {
    if (val == null || val === "" || val === 0 || val === "0" || val === "0%") return false;
    if (typeof val === "string") {
        const n = parseFloat(val);
        if (!isNaN(n) && n === 0) return false;
    }
    return true;
}

const FILTER_DEFS = [
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
    { key: "_effects", type: "has-effect", label: "app_filter_provides_effect", fields: EFFECT_FIELDS },
];

const NAME_TAG_COLS = new Set(["st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin"]);
const BADGE_COLS = new Set(["Type", "ui_mm_repair", "ui_ammo_types", "st_data_export_ammo_types_alt", "st_data_export_single_handed", ...NAME_TAG_COLS]);
const MODAL_BADGE_KEYS = new Set(["st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin", "ui_ammo_types", "st_data_export_ammo_types_alt", "ui_st_community"]);
const SKIP_KEYS = new Set(["id", "pda_encyclopedia_name", "hasNpcWeaponDrop", "hasStashDrop", "hasDisassemble", "st_data_export_description"]);
const MAX_PINS = 5;
const BUILD_HASH_PREFIX = "build/";

const LOWER_IS_BETTER = new Set(["st_data_export_weapon_degradation"]);
const HIGHER_IS_WORSE = new Set(["st_prop_weight", "st_upgr_cost", "_cost_per_round", "_malfunction_chance"]);
const NO_HIGHLIGHT = new Set(["ui_ammo_types", "st_data_export_ammo_types_alt", "ui_mm_repair"]);
const BIPOLAR = new Set([
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection", "ui_inv_outfit_shock_protection",
    "ui_inv_outfit_chemical_burn_protection", "ui_inv_outfit_radiation_protection", "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection",
    "ui_inv_outfit_explosion_protection", "st_prop_restore_health", "st_prop_restore_bleeding",
    "ui_inv_outfit_power_restore", "st_data_export_eat_health_change", "st_data_export_jump_height",
    "st_itm_desc_eat_sleepiness", "st_itm_desc_eat_thirst", "st_data_export_eat_alcohol", "ui_inv_satiety",
]);
const POSITIVE_IS_GOOD = new Set([
    "ui_inv_accuracy", "ui_inv_handling", "ui_inv_reli",
]);

const HEAL_GROUPS = [
    { label: "app_heal_post", fields: ["st_data_export_post_heal_head", "st_data_export_post_heal_torso", "st_data_export_post_heal_arm", "st_data_export_post_heal_leg"], abbr: ["H", "T", "A", "L"] },
    { label: "app_heal_first_aid", fields: ["st_data_export_first_aid_head", "st_data_export_first_aid_torso", "st_data_export_first_aid_arm", "st_data_export_first_aid_leg"], abbr: ["H", "T", "A", "L"] },
];
const HEAL_FIELDS = new Set(HEAL_GROUPS.flatMap(g => g.fields));
const RANGE_EXCLUDE = new Set([
    ...SKIP_KEYS, ...NAME_TAG_COLS, ...HEAL_FIELDS, ...BADGE_COLS,
    "name", "displayName", "ui_st_community",
]);
const TILE_HIDE = new Set(["st_upgr_cost", "pda_encyclopedia_name", "name", "pda_encyclopedia_tier", "ui_st_rank", "Type", "st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_is_backpack", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin", "st_data_export_restore_health_max", "st_data_export_restore_bleeding_max", "st_data_export_restore_radiation_max", "st_data_export_power_restore_max", "st_data_export_description", ...HEAL_FIELDS]);

const UNITS = {
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


// Build Planner constants
const PROTECTION_FIELDS = [
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection",
    "ui_inv_outfit_shock_protection", "ui_inv_outfit_chemical_burn_protection", "ui_inv_outfit_radiation_protection",
    "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection", "ui_inv_outfit_explosion_protection",
];
const RESTORATION_FIELDS = [
    "st_prop_restore_health", "st_prop_restore_bleeding", "st_data_export_restore_radiation", "ui_inv_outfit_power_restore",
];
const BASE_RESIST_CAP = 65;
const CAP_FIELD_MAP = {
    "ui_inv_outfit_fire_wound_protection": "gamma_fire_wound_cap",
    "ui_inv_outfit_wound_protection": "gamma_wound_cap",
    "ui_inv_outfit_burn_protection": "gamma_burn_cap",
    "ui_inv_outfit_shock_protection": "gamma_shock_cap",
    "ui_inv_outfit_chemical_burn_protection": "gamma_chemical_burn_cap",
    "ui_inv_outfit_telepatic_protection": "gamma_telepatic_cap",
    "ui_inv_outfit_strike_protection": "gamma_strike_cap",
    "ui_inv_outfit_explosion_protection": "gamma_explosion_cap",
};
const CAT = {
    FAVORITES: "Favorites", ALL_WEAPONS: "All Weapons",
    PISTOLS: "Pistols", SMGS: "SMGs", SHOTGUNS: "Shotguns",
    RIFLES: "Rifles", SNIPERS: "Snipers", LAUNCHERS: "Launchers", MELEE: "Melee",
    AMMO: "Ammo", EXPLOSIVES: "Explosives",
    OUTFITS: "Outfits", HELMETS: "Helmets", BELT_ATTACHMENTS: "Belt Attachments",
    OUTFIT_EXCHANGE: "Outfit Exchange", ARTEFACTS: "Artefacts",
    FOOD: "Food", MEDICINE: "Medicine",
    CRAFTING_TREES: "Crafting Trees", MATERIALS: "Materials",
    MUTANT_PARTS: "Mutant Parts", RECIPES: "Recipes",
    TOOLKIT_RATES: "Toolkit Rates",
};

const BUILD_SLOT_CATEGORIES = { outfit: CAT.OUTFITS, helmet: CAT.HELMETS, belt: CAT.BELT_ATTACHMENTS, artifact: CAT.ARTEFACTS, backpack: CAT.BELT_ATTACHMENTS };
function isBackpack(item) { return item?.st_data_export_is_backpack === "Y"; }
const MAX_SAVED_BUILDS = 10;

// Weapon/Ammo build planner constants
const WEAPON_STAT_FIELDS = [
    "ui_inv_accuracy", "ui_inv_handling", "ui_inv_damage",
    "ui_inv_rate_of_fire", "ui_ammo_count", "ui_inv_wrange",
    "ui_inv_bspeed", "ui_inv_reli", "ui_inv_recoil",
];
const AMMO_MULTIPLIER_FIELDS = new Set(["ui_inv_damage", "ui_inv_accuracy", "ui_inv_wrange", "ui_inv_bspeed"]);
const AMMO_ONLY_FIELDS = ["st_data_export_ap", "st_data_export_projectiles", "st_data_export_falloff", "st_data_export_impulse", "st_data_export_weapon_degradation"];
const GRENADE_STAT_FIELDS = ["st_data_export_blast_power", "st_detonation_radius", "st_data_export_fragments", "st_data_fragment_damage", "st_detonation_time"];
const PRIMARY_WEAPON_SLUGS = ["rifles", "shotguns", "smgs", "snipers", "launchers"];
const SIDEARM_SLUGS = ["pistols", "melee"];
const GRENADE_SLUG = "explosives";
const SLOT_COLORS = { outfit: "#5b8abd", helmet: "#5ba8a0", backpack: "#6bab5b", belt: "#c89050", artifact: "#9b6fb0", weapon: "#b85c5c", sidearm: "#b85c5c", grenade: "#7a6e50", ammo: "#8b8b5e" };

const LOCALES = [{id:"en",label:"English"},{id:"ru",label:"Русский"},{id:"fr",label:"Français"}];
const CHART_COLORS = ["#c8a84e", "#5b8abd", "#b85c5c", "#5ba8a0", "#9b6fb0"];

const SINGULAR_TYPE = { [CAT.PISTOLS]: "app_type_pistol", [CAT.SMGS]: "app_type_smg", [CAT.SHOTGUNS]: "app_type_shotgun", [CAT.RIFLES]: "app_type_rifle", [CAT.SNIPERS]: "app_type_sniper", [CAT.LAUNCHERS]: "app_type_launcher", [CAT.MELEE]: "app_cat_melee" };
const SINGULAR_CATEGORY = { ...SINGULAR_TYPE, [CAT.OUTFITS]: "app_type_outfit", [CAT.HELMETS]: "app_type_helmet", [CAT.BELT_ATTACHMENTS]: "app_type_belt_attachment", [CAT.EXPLOSIVES]: "app_type_explosive", [CAT.ARTEFACTS]: "app_type_artefact", [CAT.MATERIALS]: "app_type_material", [CAT.MUTANT_PARTS]: "app_type_mutant_part" };

const CATEGORY_KEYS = {
    [CAT.FAVORITES]: "app_cat_favorites", [CAT.ALL_WEAPONS]: "app_cat_all_weapons",
    [CAT.PISTOLS]: "app_cat_pistols", [CAT.SMGS]: "app_cat_smgs", [CAT.SHOTGUNS]: "app_cat_shotguns",
    [CAT.RIFLES]: "app_cat_rifles", [CAT.SNIPERS]: "app_cat_snipers", [CAT.LAUNCHERS]: "app_cat_launchers",
    [CAT.MELEE]: "app_cat_melee", [CAT.AMMO]: "app_cat_ammo", [CAT.EXPLOSIVES]: "app_cat_explosives",
    [CAT.OUTFITS]: "app_cat_outfits", [CAT.HELMETS]: "app_cat_helmets",
    [CAT.BELT_ATTACHMENTS]: "app_cat_belt_attachments", [CAT.OUTFIT_EXCHANGE]: "app_cat_outfit_exchange",
    [CAT.FOOD]: "app_cat_food", [CAT.MEDICINE]: "app_cat_medicine", [CAT.ARTEFACTS]: "app_cat_artefacts",
    [CAT.CRAFTING_TREES]: "app_cat_crafting_trees", [CAT.MATERIALS]: "app_cat_materials",
    [CAT.MUTANT_PARTS]: "app_cat_mutant_parts", [CAT.RECIPES]: "app_cat_recipes",
    [CAT.TOOLKIT_RATES]: "app_cat_toolkit_rates",
};
const WEAPON_CATEGORIES = [CAT.PISTOLS, CAT.SMGS, CAT.SHOTGUNS, CAT.RIFLES, CAT.SNIPERS, CAT.LAUNCHERS, CAT.MELEE];
const WEAPON_CATEGORY_SLUGS = WEAPON_CATEGORIES.map(c => categorySlug(c));
const VIRTUAL_CATEGORIES = new Set([CAT.ALL_WEAPONS, CAT.CRAFTING_TREES, CAT.TOOLKIT_RATES]);

const CATEGORY_GROUPS = [
    { name: "app_group_weapons", categories: [CAT.ALL_WEAPONS, ...WEAPON_CATEGORIES] },
    { name: "app_group_ammo_explosives", categories: [CAT.AMMO, CAT.EXPLOSIVES] },
    { name: "app_group_equipment", categories: [CAT.OUTFITS, CAT.HELMETS, CAT.BELT_ATTACHMENTS, CAT.ARTEFACTS, CAT.OUTFIT_EXCHANGE] },
    { name: "app_group_consumables", categories: [CAT.FOOD, CAT.MEDICINE] },
    { name: "app_group_crafting", categories: [CAT.CRAFTING_TREES, CAT.MATERIALS, CAT.MUTANT_PARTS, CAT.TOOLKIT_RATES] },
];

const KEYS = {
    SEARCH: '/',
    SEARCH_MOD: 'k',
    ESCAPE: 'Escape',
    TOGGLE_VIEW: 'v',
    TOGGLE_SIDEBAR: 's',
    COMPARE: 'c',
    HELP: '?',
    FILTERS: 'F',
    PREV_CATEGORY: '[',
    NEXT_CATEGORY: ']',
    FAVORITE: 'f',
    PIN: 'p',
    PREV_ITEM: 'ArrowLeft',
    NEXT_ITEM: 'ArrowRight',
    CLEAR_FILTERS: 'x',
    CHORD_GO: 'g',
    CHORD_BUILD: 'b',
};
const CHORD_TIMEOUT = 500;

function buildStatRows(item, headers) {
    if (!item || !headers.length) return [];
    const rows = [];
    for (const h of headers) {
        if (SKIP_KEYS.has(h)) continue;
        rows.push({ key: h, value: item[h], isSection: false });
    }
    return rows;
}

const FACTION_ICONS = {
    "bandit": "faction_bandits.png",
    "csky": "faction_clearsky.png",
    "dolg": "faction_duty.png",
    "ecolog": "faction_ecologists.png",
    "stalker": "faction_loners.png",
    "freedom": "faction_freedom.png",
    "killer": "faction_mercenary.png",
    "army": "faction_military.png",
    "monolith": "faction_monolith.png",
    "renegade": "faction_renegades.png",
    "greh": "faction_sin.png",
    "isg": "faction_inisig.png",
};

const FACTION_COLORS = {
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

const FACTION_LIST = ["stalker", "dolg", "freedom", "csky", "ecolog", "army", "killer", "bandit", "monolith", "renegade", "greh", "isg"];

function buildDropFactions(drops) {
    if (!drops) return [];
    return Object.entries(drops).map(([name, ranks]) => ({
        name,
        ranks,
        icon: FACTION_ICONS[name] || FACTION_ICONS[name.toLowerCase()] || null,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

function categorySlug(category) {
    return category.toLowerCase().replace(/ /g, "-");
}

function buildPathUrl(state) {
    if (state.buildPlanner && state.pack) return `/db/${state.pack}/build-planner`;
    if (state.versionCompare && state.pack) return `/db/${state.pack}/version-compare`;
    if (state.favorites && state.pack) return `/db/${state.pack}/favorites`;
    if (state.recent && state.pack) return `/db/${state.pack}/recent`;
    if (state.cat && state.pack) {
        return `/db/${state.pack}/${categorySlug(state.cat)}`;
    }
    return "/";
}

function parsePathUrl(pathname) {
    const result = { pack: null, cat: null, buildPlanner: false, favorites: false, recent: false, versionCompare: false };
    const path = pathname.replace(/\/+$/, "") || "/";
    // Legacy non-pack-scoped paths
    if (path === "/build-planner") { result.buildPlanner = true; return result; }
    if (path === "/version-compare") { result.versionCompare = true; return result; }
    const m = path.match(/^\/db\/([^/]+)(?:\/([^/]+))?$/);
    if (m) {
        result.pack = m[1];
        if (m[2] === "build-planner") result.buildPlanner = true;
        else if (m[2] === "version-compare") result.versionCompare = true;
        else if (m[2] === "favorites") result.favorites = true;
        else if (m[2] === "recent") result.recent = true;
        else if (m[2]) result.cat = m[2];
    }
    return result;
}

function saveCategoryFilters(packId, slug, state) {
    try {
        localStorage.setItem(`catFilters:${packId}:${slug}`, JSON.stringify(state));
    } catch (e) { /* quota or private mode */ }
}

function loadCategoryFilters(packId, slug) {
    try {
        const raw = localStorage.getItem(`catFilters:${packId}:${slug}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function debounce(fn, ms) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

export const appDefinition = {
    data() {
        return {
            // Pack state
            packs: [],
            activePack: null,
            packLoading: false,

            // Localisation
            LOCALES,
            locale: "en",
            translations: null,
            appTranslations: null,
            fileManifest: {},

            index: [],
            categories: [],
            groupedCategories: [],
            activeCategory: null,
            categoryItems: {},
            categoryHeaders: {},
            categoryFuse: {},
            globalQuery: "",
            lastGlobalQuery: "",
            globalResults: [],
            filterQuery: "",
            filterInput: "",
            fuse: null,
            loading: true,
            showContentSpinner: false,
            _spinnerTimer: null,
            _spinnerShownAt: null,
            sortCol: null,
            sortAsc: true,
            viewMode: "tiles",

            // Pin & Compare state
            pinnedIds: [],
            compareOpen: false,
            compareData: [],
            compareViewMode: "table",

            // Favorites state
            favoriteIds: [],
            showFavoritesOnly: false,
            favoritesViewActive: false,

            // Recent state
            recentIds: [],
            recentViewActive: false,

            // Caliber lookup
            calibers: {},
            displayLabels: {},

            // Outfit exchange
            outfitExchange: null,
            exchangeFactionFilter: null,
            toolkitRates: null,
            toolkitSortCol: null,
            toolkitSortAsc: false,

            // Caches
            calibersCache: null,
            dropsCache: null,
            itemDropsCache: null,
            recipesCache: null,
            disassembleCache: null,
            ammoWeaponsCache: null,

            // Crafting trees
            craftingTrees: [],
            craftingTreeExpanded: new Set(),
            craftingTreeExpandAll: false,

            sidebarOpen: false,
            sidebarCollapsed: false,
            collapsedGroups: {},
            hideNoDrop: true,
            hideUnusedAmmo: true,

            // Filter & Sort
            activeFilters: {},
            includeAltAmmo: false,

            // Modal state
            modalOpen: false,
            modalItem: null,
            modalCategory: "",
            modalHeaders: [],
            modalDrops: null,
            modalItemDrops: null,
            modalRecipeData: null,
            modalDisassemble: null,
            modalAmmoWeapons: null,
            modalLoading: false,
            copyIdFeedback: false,
            copyModalLinkFeedback: false,
            copyLinkFeedback: false,
            _restoringUrl: false,

            // Cross-pack comparison
            crossPackId: localStorage.getItem("crossPackId") || null,
            crossPackItem: null,
            crossPackHeaders: [],
            crossPackLoading: false,
            crossPackNotFound: false,
            crossPackCache: {},

            // Build Planner state
            buildPlayerName: "Stalker",
            buildPlayerFaction: "stalker",
            buildPlannerActive: false,
            versionCompareActive: false,
            versionCompareLoading: false,
            versionCompareResults: [],
            versionCompareFilter: "",
            shortcutHelpOpen: false,
            _chordKey: null,
            _chordTimer: null,
            hasUnseenReleaseNotes: false,

            // What's New & Feature Callouts
            whatsNewVisible: false,
            whatsNewEntries: [],
            whatsNewTotalCount: 0,
            calloutActive: false,
            calloutCurrent: null,
            calloutSpotlightStyle: {},
            calloutPopoverStyle: {},
            calloutArrowSide: "top",
            calloutArrowStyle: {},
            buildOutfit: null,
            buildHelmet: null,
            buildBackpack: null,
            buildBelts: [],
            buildArtifacts: [],
            buildWeaponPrimary: null,
            buildWeaponSecondary: null,
            buildWeaponSidearm: null,
            buildWeaponGrenade: null,
            buildAmmoPrimary: null,
            buildAmmoSecondary: null,
            buildAmmoSidearm: null,
            buildActiveWeaponTab: "primary",
            buildPickerOpen: false,
            buildPickerSlot: null,
            buildPickerQuery: "",
            buildPickerFuse: null,
            buildExpandedStats: {},
            buildHideGearStats: false,
            buildHideWeaponStats: false,
            buildRadarVisible: false,
            buildLoadoutCollapsed: false,
            buildSavedBuilds: [],
            buildSaveName: "",
            buildSaveModalOpen: false,
            copyBuildLinkFeedback: false,
            copyBuildCodeFeedback: false,
            buildImportCode: "",
            buildImportError: "",
            buildImportCodeModalOpen: false,
            buildSharing: false,

            // Save file import
            saveImportModalOpen: false,
            saveImportParsing: false,
            saveImportError: "",
            saveImportPreview: null,
            saveImportFileName: "",
            saveImportIncludeStash: true,
            saveImportIncludeAmmo: false,
            toastMessage: "",
            toastType: "error",

            // Item hover popover
            buildHoverItem: null,
            buildHoverCompareItem: null,
            buildHoverPos: null,
            buildHoverTimeout: null,

            buildWeaponCompareSlot: "primary",  // "primary" | "secondary" | "sidearm"

            // Inventory staging area
            buildInventory: [],              // Array of { item, slotType } objects
            buildInventoryCollapsed: false,
            buildInventorySort: "none",      // "none" | "name" | "category"
            buildDragState: null,            // { source, slotType, itemId, ... } for visual feedback
        };
    },

    computed: {
        calloutTitle() {
            if (!this.calloutCurrent) return "";
            return this.calloutCurrent.titleKey ? this.t(this.calloutCurrent.titleKey) : (this.calloutCurrent.title || "");
        },
        calloutDesc() {
            if (!this.calloutCurrent) return "";
            return this.calloutCurrent.descKey ? this.t(this.calloutCurrent.descKey) : (this.calloutCurrent.description || "");
        },
        dataBasePath() {
            if (!this.activePack) return "/data";
            return `/data/${this.activePack.id}`;
        },

        categoryCounts() {
            const counts = {};
            for (const item of this.index) {
                if (this.hideNoDrop && item.hasNpcWeaponDrop === false) continue;
                if (this.hideUnusedAmmo && item.category === 'Ammo' && this.ammoWeaponsCache) {
                    const weapons = this.ammoWeaponsCache[item.id];
                    if (!weapons || weapons.length === 0) continue;
                    if (this.hideNoDrop && !weapons.some(w => !w.noDrop)) continue;
                }
                counts[item.category] = (counts[item.category] || 0) + 1;
            }
            // "All Weapons" is the sum of all weapon categories
            let allWeapons = 0;
            for (const c of WEAPON_CATEGORIES) allWeapons += counts[c] || 0;
            counts[CAT.ALL_WEAPONS] = allWeapons;
            counts[CAT.CRAFTING_TREES] = counts[CAT.RECIPES] || 0;
            counts[CAT.FAVORITES] = this.favoriteIds.length;
            return counts;
        },

        pinnedItems() {
            return this.pinnedIds.map((id) => {
                const entry = this.index.find((i) => i.id === id);
                if (!entry) return { id, displayName: id, category: "?" };
                return { id, displayName: this.tName(entry), category: entry.category };
            });
        },

        compareHeaders() {
            const seen = new Set();
            const ordered = [];
            for (const entry of this.compareData) {
                for (const h of entry.headers) {
                    if (SKIP_KEYS.has(h) || seen.has(h)) continue;
                    seen.add(h);
                    ordered.push(h);
                }
            }
            return ordered;
        },

        compareStatRows() {
            const rows = [];
            for (const h of this.compareHeaders) {
                const values = this.compareData.map((entry) => {
                    const val = entry.item[h];
                    return val !== undefined && val !== null && val !== "" ? val : "--";
                });
                if (new Set(values).size === 1) continue;
                rows.push(this.buildCompareRow(h, values));
            }
            return rows;
        },

        compareRadarFields() {
            if (this.compareData.length === 0) return [];
            const categories = this.compareData.map(e => e.category);
            if (categories.every(c => WEAPON_CATEGORIES.includes(c))) return WEAPON_STAT_FIELDS;
            if (categories.every(c => c === CAT.OUTFITS || c === CAT.HELMETS)) return PROTECTION_FIELDS;
            if (categories.every(c => c === CAT.AMMO)) return [...AMMO_MULTIPLIER_FIELDS, ...AMMO_ONLY_FIELDS];
            // Mixed: find common numeric fields
            return this.compareHeaders.filter(h => {
                if (SKIP_KEYS.has(h) || BADGE_COLS.has(h) || NO_HIGHLIGHT.has(h)) return false;
                return this.compareData.some(e => {
                    const v = e.item[h];
                    return v != null && !isNaN(parseFloat(String(v).replace("%", "")));
                });
            }).slice(0, 12);
        },

        tileFields() {
            if (!this.activeCategory) return [];
            const isAmmo = this.activeCategory === CAT.AMMO;
            return this.displayHeaders.filter(h => {
                if (h.startsWith("Total ")) return false;
                if (h === "st_upgr_cost") return isAmmo;
                return !TILE_HIDE.has(h);
            });
        },

        tileHealGroups() {
            if (!this.activeCategory) return [];
            const slug = categorySlug(this.activeCategory);
            const raw = this.categoryHeaders[slug] || [];
            return HEAL_GROUPS.filter(g => g.fields.some(f => raw.includes(f)));
        },

        tableHealGroups() {
            return this.tileHealGroups;
        },

        tableColumns() {
            const headers = this.displayHeaders.map(h => ({ type: 'header', key: h }));
            const healGroups = this.tableHealGroups;
            if (healGroups.length === 0) return headers;
            const tierIdx = headers.findIndex(c => c.key === 'pda_encyclopedia_tier');
            const insertAt = tierIdx >= 0 ? tierIdx + 1 : 1;
            headers.splice(insertAt, 0, { type: 'heal', key: '_heal', groups: healGroups });
            return headers;
        },

        parsedDescription() {
            if (!this.modalItem?.st_data_export_description) return null;
            return this.parseDescription(this.modalItem);
        },

        modalStatRows() {
            const isWeapon = WEAPON_CATEGORIES.includes(this.modalCategory);
            const rows = buildStatRows(this.modalItem, this.modalHeaders).filter(r => !HEAL_FIELDS.has(r.key) && !MODAL_BADGE_KEYS.has(r.key) && !(isWeapon && r.key === "st_upgr_cost"));
            const reliIdx = rows.findIndex(r => r.key === "ui_inv_reli");
            if (reliIdx >= 0) {
                const reliVal = parseFloat(String(rows[reliIdx].value).replace("%", ""));
                if (!isNaN(reliVal)) {
                    const malf = malfunctionChance(reliVal);
                    rows.splice(reliIdx + 1, 0, { key: "_malfunction_chance", value: malf, isSection: false });
                }
            }
            const costIdx = rows.findIndex(r => r.key === "st_upgr_cost");
            if (costIdx >= 0 && this.modalCategory === CAT.AMMO) {
                const cpr = this.cellValue(this.modalItem, "_cost_per_round");
                if (cpr !== undefined) {
                    rows.splice(costIdx + 1, 0, { key: "_cost_per_round", value: cpr, isSection: false });
                }
            }
            return rows;
        },

        crossPackOptions() {
            return this.packs.filter(p => p.id !== this.activePack.id);
        },

        crossPackName() {
            if (!this.crossPackId) return "";
            const p = this.packs.find(p => p.id === this.crossPackId);
            return p ? p.name : this.crossPackId;
        },

        crossPackDiffs() {
            if (!this.crossPackItem || !this.modalStatRows) return [];
            return this.modalStatRows.filter(row => {
                if (row.isSection) return false;
                const otherVal = this.cellValue(this.crossPackItem, row.key);
                const diff = this.computeStatDiff(row.key, row.value, otherVal);
                if (!diff || diff.type === "same") return false;
                row.diff = diff;
                row.otherValue = otherVal;
                return true;
            });
        },

        versionCompareTotal() {
            return this.versionCompareResults.reduce((sum, g) => sum + g.items.length, 0);
        },

        filteredVersionCompareResults() {
            if (!this.versionCompareFilter) return this.versionCompareResults;
            const q = this.versionCompareFilter.toLowerCase();
            const groups = [];
            for (const group of this.versionCompareResults) {
                const items = group.items.filter(item => item.name.toLowerCase().includes(q));
                if (items.length) groups.push({ ...group, items });
            }
            return groups;
        },

        modalHealGroups() {
            if (!this.modalHeaders) return [];
            return HEAL_GROUPS.filter(g => g.fields.some(f => this.modalHeaders.includes(f)));
        },

        modalDropFactions() {
            return buildDropFactions(this.modalDrops);
        },

        modalItemDropLocations() {
            if (!this.modalItemDrops) return [];
            const byMap = new Map();
            for (const [type, locations] of Object.entries(this.modalItemDrops)) {
                for (const loc of locations) {
                    if (!byMap.has(loc.map)) byMap.set(loc.map, { map: loc.map });
                    const row = byMap.get(loc.map);
                    row[type] = { chance: loc.chance, ecos: loc.ecos };
                }
            }
            const rows = [...byMap.values()];
            rows.sort((a, b) => a.map.localeCompare(b.map));
            return rows;
        },

        modalItemDropTypes() {
            if (!this.modalItemDrops) return [];
            return Object.keys(this.modalItemDrops);
        },

        modalItemDropHasRestrictedEcos() {
            if (!this.modalItemDrops) return false;
            const full = [1, 2, 3];
            for (const locations of Object.values(this.modalItemDrops)) {
                for (const loc of locations) {
                    if (loc.ecos.length !== 3 || !full.every((v, i) => loc.ecos[i] === v)) return true;
                }
            }
            return false;
        },

        modalDropBest() {
            const locs = this.modalItemDropLocations;
            if (locs.length < 2) return {};
            const best = {};
            for (const type of this.modalItemDropTypes) {
                const vals = locs.map(r => r[type] ? r[type].chance : 0);
                const max = Math.max(...vals);
                if (max > 0) best[type] = max;
            }
            return best;
        },

        isOutfitExchange() {
            return this.activeCategory === CAT.OUTFIT_EXCHANGE;
        },

        isMaterialsCategory() {
            return this.activeCategory === CAT.MATERIALS;
        },

        isCraftingTrees() {
            return this.activeCategory === CAT.CRAFTING_TREES;
        },

        isToolkitRates() {
            return this.activeCategory === CAT.TOOLKIT_RATES;
        },

        toolkitRatesSorted() {
            if (!this.toolkitRates) return [];
            let maps = [...this.toolkitRates.maps];
            if (this.filterQuery.trim()) {
                const q = this.filterQuery.toLowerCase();
                maps = maps.filter(m => this.t(m.id).toLowerCase().includes(q));
            }
            const col = this.toolkitSortCol;
            if (col) {
                maps.sort((a, b) => {
                    const av = col === '_name' ? this.t(a.id) : (a.rates[col] || 0);
                    const bv = col === '_name' ? this.t(b.id) : (b.rates[col] || 0);
                    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
                    return this.toolkitSortAsc ? cmp : -cmp;
                });
            }
            return maps;
        },

        filteredCraftingTrees() {
            if (!this.craftingTrees.length) return [];
            if (!this.filterQuery.trim()) return this.craftingTrees;
            const q = this.filterQuery.toLowerCase();
            return this.craftingTrees.filter(tree => {
                if (this.t(tree.name).toLowerCase().includes(q)) return true;
                const check = (node) => {
                    if (this.t(node.name).toLowerCase().includes(q)) return true;
                    return node.children && node.children.some(check);
                };
                return check(tree);
            });
        },

        isAllWeapons() {
            return this.activeCategory === CAT.ALL_WEAPONS;
        },

        modalDisassembleMaterials() {
            return this.modalDisassemble;
        },

        modalAmmoVariants() {
            if (!this.modalItem) return [];
            const ammo = this.modalItem["ui_ammo_types"];
            const alt = this.modalItem["st_data_export_ammo_types_alt"];
            if (!ammo && !alt) return [];
            const primary = this.caliberVariantObjects(ammo);
            const altVariants = this.caliberVariantObjects(alt).map(v => ({ ...v, isAlt: true }));
            return [...primary, ...altVariants];
        },

        modalAmmoStatKeys() {
            if (this.modalAmmoVariants.length === 0) return [];
            const keys = ["ui_inv_damage", "AP", "ui_inv_accuracy", "ui_inv_wrange", "st_data_export_falloff", "ui_inv_bspeed", "st_data_export_weapon_degradation", "st_data_export_projectiles", "st_upgr_cost"];
            return keys.filter(k => k === "AP"
                ? this.modalAmmoVariants.some(v => v.apClass)
                : this.modalAmmoVariants.some(v => v[k]));
        },

        modalAmmoBest() {
            const variants = this.modalAmmoVariants;
            if (variants.length < 2) return {};
            const LOWER_BETTER = new Set(["st_data_export_falloff", "st_upgr_cost", "st_data_export_weapon_degradation"]);
            const best = {};
            for (const k of this.modalAmmoStatKeys) {
                if (k === "AP") {
                    const apVals = variants.filter(v => v.apClass).map(v => ({ apClass: v.apClass, apValue: v.apValue }));
                    if (apVals.length < 2) continue;
                    const allSame = apVals.every(a => a.apClass === apVals[0].apClass && a.apValue === apVals[0].apValue);
                    if (allSame) continue;
                    apVals.sort((a, b) => b.apClass - a.apClass || b.apValue - a.apValue);
                    best["AP"] = apVals[0];
                    continue;
                }
                const nums = variants.map(v => parseFloat(String(v[k] || "").replace("%", ""))).filter(n => !isNaN(n));
                if (nums.length < 2) continue;
                const allSame = nums.every(n => n === nums[0]);
                if (allSame) continue;
                const winner = LOWER_BETTER.has(k) ? Math.min(...nums) : Math.max(...nums);
                best[k] = winner;
            }
            return best;
        },

        modalUsedByWeapons() {
            if (!this.modalAmmoWeapons) return [];
            const list = this.hideNoDrop ? this.modalAmmoWeapons.filter(w => !w.noDrop) : [...this.modalAmmoWeapons];
            list.sort((a, b) => a.name.localeCompare(b.name));
            return list;
        },

        exchangeFactions() {
            return this.outfitExchange?.factions || [];
        },

        filteredExchanges() {
            if (!this.outfitExchange) return [];
            let exchanges = this.outfitExchange.exchanges;
            if (this.exchangeFactionFilter) {
                const f = this.exchangeFactionFilter;
                exchanges = exchanges.filter(ex => ex.results[f]);
            }
            if (!this.filterQuery.trim()) return exchanges;
            const q = this.filterQuery.toLowerCase();
            return exchanges.filter(ex =>
                this.t(ex.name).toLowerCase().includes(q) ||
                this.t(ex.sourceFaction).toLowerCase().includes(q) ||
                Object.values(ex.results).some(v => this.t(v).toLowerCase().includes(q))
            );
        },

        exchangeVisibleFactions() {
            if (this.exchangeFactionFilter) return [this.exchangeFactionFilter];
            return this.exchangeFactions;
        },

        modalRecipe() {
            if (!this.modalItem || !this.modalRecipeData) return null;
            if (this.modalItem["st_data_export_can_be_crafted"] !== "Y") return null;
            const recipes = this.modalRecipeData.items || [];
            const recipe = recipes.find(r => r.id === this.modalItem.id);
            return recipe ? recipe.ingredients : null;
        },

        modalUsedInRecipes() {
            if (!this.modalItem || !this.modalRecipeData) return [];
            if (this.modalItem["st_data_export_used_in_crafting"] !== "Y") return [];
            const itemName = this.modalItem.pda_encyclopedia_name || this.modalItem.name;
            const recipes = this.modalRecipeData.items || [];
            return recipes.filter(r =>
                r.ingredients.some(ing => ing.name === itemName)
            );
        },

        displayHeaders() {
            if (!this.activeCategory) return [];
            const slug = categorySlug(this.activeCategory);
            const raw = this.categoryHeaders[slug] || [];
            const items = this.categoryItems[slug] || [];

            const filtered = raw.filter((h) => {
                if (h === "id" || h === "st_upgr_cost" || h === "displayName") return false;
                if (h === "st_data_export_description") return false;
                if (NAME_TAG_COLS.has(h)) return false;
                if (HEAL_FIELDS.has(h)) return false;
                if (items.length > 0) {
                    const first = items[0][h] ?? "";
                    if (items.every((item) => (item[h] ?? "") === first)) return false;
                }
                return true;
            });

            const isWeapon = WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === CAT.ALL_WEAPONS;
            if (raw.includes("st_upgr_cost") && !isWeapon) {
                filtered.push("st_upgr_cost");
                if (this.activeCategory === CAT.AMMO) filtered.push("_cost_per_round");
            }

            // Ensure Faction appears right after Name
            const facIdx = filtered.indexOf("ui_st_community");
            const nameIdx = filtered.indexOf("pda_encyclopedia_name");
            if (facIdx >= 0 && nameIdx >= 0 && facIdx < nameIdx) {
                filtered.splice(facIdx, 1);
                filtered.splice(nameIdx, 0, "ui_st_community");
            }

            // Inject malfunction chance after reliability
            const reliIdx = filtered.indexOf("ui_inv_reli");
            if (reliIdx >= 0) {
                filtered.splice(reliIdx + 1, 0, "_malfunction_chance");
            }

            return filtered;
        },

        activeNameTags() {
            if (!this.activeCategory) return [];
            const slug = categorySlug(this.activeCategory);
            const raw = this.categoryHeaders[slug] || [];
            return raw.filter(h => NAME_TAG_COLS.has(h));
        },

        availableFilters() {
            const headers = this.displayHeaders;
            if (!headers.length) return [];
            const slug = categorySlug(this.activeCategory);
            const raw = this.categoryHeaders[slug] || [];
            const items = this.categoryItems[slug] || [];
            const existingDefs = FILTER_DEFS.filter(def => {
                if (def.type === "has-effect") {
                    return [...def.fields].some(f => headers.includes(f) || raw.includes(f));
                }
                if (def.type === "flag") return raw.includes(def.key);
                if (def.key === "ui_st_community") return raw.includes("ui_st_community");
                return headers.includes(def.key) || raw.includes(def.key);
            }).map(def => {
                if (def.type === "has-effect") {
                    const vals = [];
                    for (const f of def.fields) {
                        if (!headers.includes(f) && !raw.includes(f)) continue;
                        if (items.some(item => isNonZero(item[f]))) vals.push(f);
                    }
                    return vals.length > 0 ? { ...def, values: vals } : null;
                }
                if (def.type === "discrete" && def.dynamic) {
                    const vals = new Set();
                    for (const item of items) {
                        const v = item[def.key];
                        if (v !== undefined && v !== null && v !== "") {
                            if (def.key === "ui_ammo_types") {
                                for (const s of String(v).split(";")) {
                                    const t = s.trim();
                                    if (t) vals.add(t);
                                }
                            } else {
                                vals.add(String(v));
                            }
                        }
                    }
                    return { ...def, values: [...vals].sort() };
                }
                return def;
            }).filter(Boolean);

            // Auto-detect numeric range filters
            const coveredKeys = new Set(existingDefs.map(d => d.key));
            const rangeDefs = [];
            for (const h of raw) {
                if (coveredKeys.has(h) || RANGE_EXCLUDE.has(h)) continue;
                let numCount = 0, totalNonEmpty = 0;
                let lo = Infinity, hi = -Infinity, maxDecimals = 0, hasPercent = false;
                for (const item of items) {
                    let v = item[h];
                    if (v == null || v === "") continue;
                    totalNonEmpty++;
                    const s = String(v);
                    if (s.endsWith("%")) hasPercent = true;
                    const n = parseFloat(s.replace(/%$/, ""));
                    if (!isNaN(n)) {
                        numCount++;
                        if (n < lo) lo = n;
                        if (n > hi) hi = n;
                        const dotIdx = s.replace(/%$/, "").indexOf(".");
                        if (dotIdx >= 0) {
                            const dec = s.replace(/%$/, "").length - dotIdx - 1;
                            if (dec > maxDecimals) maxDecimals = dec;
                        }
                    }
                }
                if (totalNonEmpty > 0 && numCount / totalNonEmpty >= 0.8) {
                    const step = maxDecimals > 0 ? 0.1 : 1;
                    rangeDefs.push({
                        key: h,
                        type: "range",
                        label: this.headerLabel(h),
                        dataMin: lo === Infinity ? 0 : lo,
                        dataMax: hi === -Infinity ? 0 : hi,
                        step,
                        unit: hasPercent ? "%" : (this.tUnit(h) || null),
                    });
                }
            }
            return [...existingDefs, ...rangeDefs];
        },

        rangeFilters() {
            return this.availableFilters.filter(d => d.type === "range");
        },
        rangeFiltersLeft() {
            const all = this.rangeFilters;
            const half = Math.ceil(all.length / 2);
            return all.slice(0, half);
        },
        rangeFiltersRight() {
            const all = this.rangeFilters;
            const half = Math.ceil(all.length / 2);
            return all.slice(half);
        },

        activeFilterCount() {
            let count = 0;
            for (const [, val] of Object.entries(this.activeFilters)) {
                if (Array.isArray(val) && val.length === 2 && (typeof val[0] === "number" || val[0] === null)) {
                    if (val[0] !== null || val[1] !== null) count++;
                } else if (Array.isArray(val) && val.length > 0) count++;
                else if (val === true) count++;
            }
            return count;
        },

        activeFilterChips() {
            const chips = [];
            for (const [key, val] of Object.entries(this.activeFilters)) {
                // Range filter: 2-element array with number|null entries
                if (Array.isArray(val) && val.length === 2 && (typeof val[0] === "number" || val[0] === null) && (typeof val[1] === "number" || val[1] === null)) {
                    if (val[0] === null && val[1] === null) continue;
                    const rangeDef = this.availableFilters.find(d => d.key === key && d.type === "range");
                    const unit = rangeDef?.unit || this.tUnit(key) || "";
                    let display;
                    if (val[0] !== null && val[1] !== null) display = val[0] + " \u2013 " + val[1] + unit;
                    else if (val[0] !== null) display = "\u2265 " + val[0] + unit;
                    else display = "\u2264 " + val[1] + unit;
                    const label = this.headerLabel(key);
                    chips.push({ key, label, display, type: "range" });
                    continue;
                }
                const def = FILTER_DEFS.find(d => d.key === key);
                if (!def) continue;
                if (def.type === "flag" && (val === true || val === false)) {
                    chips.push({ key, label: def.label, value: val, display: val ? this.t("app_label_yes") : this.t("app_label_no"), type: "flag" });
                } else if (Array.isArray(val)) {
                    for (const v of val) {
                        const display = this.filterValueLabel(def, v);
                        chips.push({ key, label: def.label, value: v, display, type: def.type === "has-effect" ? "discrete" : "discrete" });
                    }
                }
            }
            return chips;
        },

        sortableFields() {
            const fields = this.displayHeaders.filter(h => !BADGE_COLS.has(h) || h === "Type" || h === "ui_mm_repair" || h === "ui_ammo_types" || h === "st_data_export_single_handed");
            if (this.tableHealGroups.length > 0) fields.push("_heal");
            fields.sort((a, b) => this.headerLabel(a).localeCompare(this.headerLabel(b)));
            return fields;
        },

        filteredItems() {
            if (this.favoritesViewActive) {
                const favSet = new Set(this.favoriteIds);
                let items = this.index.filter(i => favSet.has(i.id));
                if (!this.filterQuery.trim()) return items;
                const fuse = new Fuse(items, { keys: ["localeName", "id"], threshold: 0.35 });
                return fuse.search(this.filterQuery).map(r => r.item);
            }
            if (this.recentViewActive) {
                const indexMap = new Map(this.index.map(i => [i.id, i]));
                let items = this.recentIds.map(id => indexMap.get(id)).filter(Boolean);
                if (!this.filterQuery.trim()) return items;
                const fuse = new Fuse(items, { keys: ["localeName", "id"], threshold: 0.35 });
                return fuse.search(this.filterQuery).map(r => r.item);
            }
            if (!this.activeCategory) return [];
            const slug = categorySlug(this.activeCategory);
            let items = this.categoryItems[slug] || [];
            if (this.hideNoDrop) {
                items = items.filter((i) => i.hasNpcWeaponDrop !== false);
            }
            if (this.hideUnusedAmmo && slug === 'ammo' && this.ammoWeaponsCache) {
                items = items.filter(i => {
                    const weapons = this.ammoWeaponsCache[i.id];
                    if (!weapons || weapons.length === 0) return false;
                    if (this.hideNoDrop) return weapons.some(w => !w.noDrop);
                    return true;
                });
            }
            items = this.applyFilters(items);
            if (this.showFavoritesOnly) {
                const favSet = new Set(this.favoriteIds);
                items = items.filter(i => favSet.has(i.id));
            }
            if (!this.filterQuery.trim()) return items;
            const fuse = this.categoryFuse[slug];
            if (!fuse) return items;
            const filtered = new Set(items);
            return fuse.search(this.filterQuery).map((r) => r.item).filter((i) => filtered.has(i));
        },

        sortedItems() {
            const items = this.filteredItems;
            if (!this.sortCol) return items;

            const col = this.sortCol;
            const dir = this.sortAsc ? 1 : -1;

            return [...items].sort((a, b) => {
                if (col === "_heal") {
                    const sum = item => [...HEAL_FIELDS].reduce((s, f) => s + (parseInt(item[f]) || 0), 0);
                    return (sum(a) - sum(b)) * dir;
                }
                const isName = col === "pda_encyclopedia_name" || col === "name";
                const av = isName ? (this.tName(a) || "") : (this.cellValue(a, col) ?? "");
                const bv = isName ? (this.tName(b) || "") : (this.cellValue(b, col) ?? "");
                const an = parseFloat(av.toString().replace("%", ""));
                const bn = parseFloat(bv.toString().replace("%", ""));
                if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
                return av.toString().localeCompare(bv.toString()) * dir;
            });
        },

        columnRanges() {
            if (!this.activeCategory) return {};
            const slug = categorySlug(this.activeCategory);
            const items = this.filteredItems;
            const headers = this.categoryHeaders[slug] || [];
            const ranges = {};
            const allHeaders = [...headers];
            if (headers.includes("ui_inv_reli") && !allHeaders.includes("_malfunction_chance")) {
                allHeaders.push("_malfunction_chance");
            }
            if (headers.includes("st_upgr_cost") && this.activeCategory === CAT.AMMO && !allHeaders.includes("_cost_per_round")) {
                allHeaders.push("_cost_per_round");
            }
            for (const h of allHeaders) {
                if (RANGE_EXCLUDE.has(h) || NO_HIGHLIGHT.has(h)) continue;
                if (h.includes("/")) continue;
                let min = Infinity, max = -Infinity;
                for (const item of items) {
                    const v = this.cellValue(item, h);
                    const s = String(v ?? "");
                    const n = parseFloat(s.replace(/%$/, ""));
                    if (isNaN(n)) continue;
                    if (n > max) max = n;
                    if (n < min) min = n;
                }
                if (max !== -Infinity) ranges[h] = { max, min };
            }
            return ranges;
        },

        buildBeltSlotMax() {
            if (!this.buildOutfit) return 0;
            return parseInt(this.buildOutfit["st_data_export_outfit_artefact_count_max"]) || 0;
        },

        buildBeltSlotUsed() {
            return this.buildBelts.length + this.buildArtifacts.length;
        },

        // Fixed 5-slot array: filled items first, then empty available, then disabled
        buildBeltSlots() {
            const max = this.buildOutfit ? this.buildBeltSlotMax : 0;
            if (max === 0) {
                return [{ state: "disabled" }];
            }
            const slots = [];
            for (let i = 0; i < this.buildBelts.length; i++) {
                slots.push({ state: "filled", type: "belt", item: this.buildBelts[i], index: i });
            }
            for (let i = 0; i < this.buildArtifacts.length; i++) {
                slots.push({ state: "filled", type: "artifact", item: this.buildArtifacts[i], index: i });
            }
            while (slots.length < max) {
                slots.push({ state: "empty" });
            }
            return slots;
        },

        buildLoadoutSummary() {
            const parts = [];
            // Gear
            const gear = [this.buildHelmet, this.buildOutfit, this.buildBackpack].filter(Boolean);
            if (gear.length) parts.push(gear.map(i => this.tName(i)).join(" · "));
            // Belt/artifacts
            const beltArt = [...this.buildBelts, ...this.buildArtifacts];
            if (beltArt.length) parts.push(beltArt.map(i => this.tName(i)).join(" · "));
            // Weapons with ammo
            const wpns = [];
            if (this.buildWeaponPrimary) {
                let s = this.tName(this.buildWeaponPrimary);
                if (this.buildAmmoPrimary) s += " + " + this.shortAmmoName(this.tName(this.buildAmmoPrimary));
                wpns.push(s);
            }
            if (this.buildWeaponSecondary) {
                let s = this.tName(this.buildWeaponSecondary);
                if (this.buildAmmoSecondary) s += " + " + this.shortAmmoName(this.tName(this.buildAmmoSecondary));
                wpns.push(s);
            }
            if (this.buildWeaponSidearm) {
                let s = this.tName(this.buildWeaponSidearm);
                if (this.buildAmmoSidearm) s += " + " + this.shortAmmoName(this.tName(this.buildAmmoSidearm));
                wpns.push(s);
            }
            if (this.buildWeaponGrenade) wpns.push(this.tName(this.buildWeaponGrenade));
            if (wpns.length) parts.push(wpns.join(" · "));
            return parts.join("  |  ");
        },

        buildAllItems() {
            const items = [];
            if (this.buildOutfit) items.push({ item: this.buildOutfit, slot: "outfit" });
            if (this.buildHelmet) items.push({ item: this.buildHelmet, slot: "helmet" });
            if (this.buildBackpack) items.push({ item: this.buildBackpack, slot: "backpack" });
            for (const b of this.buildBelts) items.push({ item: b, slot: "belt" });
            for (const a of this.buildArtifacts) items.push({ item: a, slot: "artifact" });
            if (this.buildWeaponPrimary) items.push({ item: this.buildWeaponPrimary, slot: "weapon" });
            if (this.buildWeaponSecondary) items.push({ item: this.buildWeaponSecondary, slot: "weapon" });
            if (this.buildWeaponSidearm) items.push({ item: this.buildWeaponSidearm, slot: "sidearm" });
            if (this.buildWeaponGrenade) items.push({ item: this.buildWeaponGrenade, slot: "grenade" });
            if (this.buildAmmoPrimary) items.push({ item: this.buildAmmoPrimary, slot: "ammo" });
            if (this.buildAmmoSecondary) items.push({ item: this.buildAmmoSecondary, slot: "ammo" });
            if (this.buildAmmoSidearm) items.push({ item: this.buildAmmoSidearm, slot: "ammo" });
            return items;
        },

        buildCombinedStats() {
            const all = this.buildAllItems;
            const empty = all.length === 0;

            const parseNum = (v) => {
                if (v == null || v === "") return 0;
                return parseFloat(String(v).replace(/%$/, "")) || 0;
            };

            // Sum protections with per-slot-type segments
            const protections = {};
            for (const f of PROTECTION_FIELDS) {
                const slotTotals = { outfit: 0, helmet: 0, backpack: 0, belt: 0, artifact: 0 };
                const breakdown = [];
                for (const { item, slot } of all) {
                    const v = parseNum(item[f]);
                    if (v !== 0) breakdown.push({ name: item.pda_encyclopedia_name || item.id, value: v, slot });
                    slotTotals[slot] += v;
                }
                // Apply overall resist cap: base 65% + sum of gamma_*_cap from all items
                const capField = CAP_FIELD_MAP[f];
                let total = slotTotals.outfit + slotTotals.helmet + slotTotals.belt + slotTotals.artifact + slotTotals.backpack;
                let capped = false;
                if (capField && total > 0) {
                    let capSum = 0;
                    for (const { item } of all) {
                        capSum += parseNum(item[capField]);
                    }
                    const maxResist = BASE_RESIST_CAP + capSum;
                    if (total > maxResist) {
                        const ratio = maxResist / total;
                        slotTotals.outfit *= ratio;
                        slotTotals.helmet *= ratio;
                        slotTotals.backpack *= ratio;
                        slotTotals.belt *= ratio;
                        slotTotals.artifact *= ratio;
                        total = maxResist;
                        capped = true;
                    }
                }
                protections[f] = { total, breakdown, capped, segments: slotTotals };
            }

            // Sum a field across items, returning { total, breakdown, segments }
            const sumField = (field, slotFilter) => {
                const breakdown = [];
                const segments = { outfit: 0, helmet: 0, backpack: 0, belt: 0, artifact: 0 };
                let total = 0;
                for (const { item, slot } of all) {
                    if (slotFilter && !slotFilter(slot)) continue;
                    const v = parseNum(item[field]);
                    if (v !== 0) {
                        breakdown.push({ name: item.pda_encyclopedia_name || item.id, value: v, slot });
                        total += v;
                        segments[slot] += v;
                    }
                }
                return { total, breakdown, segments };
            };

            // Sum restoration effects
            const restorations = {};
            for (const f of RESTORATION_FIELDS) {
                restorations[f] = sumField(f);
            }

            const { total: totalWeight, breakdown: weightBreakdown, segments: weightSegments } = sumField("st_prop_weight");
            const { total: carryWeight, breakdown: carryBreakdown, segments: carrySegments } = sumField("ui_inv_outfit_additional_weight");
            const baseCarryWeight = (this.activePack && this.activePack.baseCarryWeight) || 0;
            const totalCarryCapacity = baseCarryWeight + carryWeight;
            const { total: armorPoints, breakdown: armorBreakdown, segments: armorSegments } = sumField("ui_inv_ap_res", s => s === "outfit" || s === "helmet" || s === "belt");

            // Speed (outfit-only)
            const speed = this.buildOutfit ? parseNum(this.buildOutfit["ui_inv_outfit_speed"]) : null;

            // Sort breakdowns descending by value
            const sortDesc = arr => arr.sort((a, b) => b.value - a.value);
            sortDesc(weightBreakdown);
            sortDesc(carryBreakdown);
            sortDesc(armorBreakdown);
            for (const f of PROTECTION_FIELDS) sortDesc(protections[f].breakdown);
            for (const f of RESTORATION_FIELDS) sortDesc(restorations[f].breakdown);

            return { protections, restorations, totalWeight, weightBreakdown, weightSegments, carryWeight, carryBreakdown, carrySegments, baseCarryWeight, totalCarryCapacity, armorPoints, armorBreakdown, armorSegments, speed };
        },

        factionList() { return FACTION_LIST.map(id => ({ id, label: this.t(id) || id })); },

        buildAllExpanded() {
            const stats = this.buildCombinedStats;
            const allFields = ["weight", "carry", "armor", ...PROTECTION_FIELDS, ...RESTORATION_FIELDS];
            const wpnFields = this.buildWeaponStats ? this.buildWeaponStats.stats.filter(s => s.modifier != null).map(s => "wpn_" + s.field) : [];
            const expandable = allFields.filter(f => {
                if (f === "weight") return stats.weightBreakdown.length > 0;
                if (f === "carry") return stats.carryBreakdown.length > 0;
                if (f === "armor") return stats.armorBreakdown.length > 0;
                if (PROTECTION_FIELDS.includes(f)) return stats.protections[f].breakdown.length > 0;
                if (RESTORATION_FIELDS.includes(f)) return stats.restorations[f].breakdown.length > 0;
                return false;
            }).concat(wpnFields);
            if (expandable.length === 0) return false;
            return expandable.every(f => this.buildExpandedStats[f]);
        },

        buildActiveWeapon() {
            const map = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm, grenade: this.buildWeaponGrenade };
            if (map[this.buildActiveWeaponTab]) return map[this.buildActiveWeaponTab];
            return this.buildWeaponPrimary || this.buildWeaponSecondary || this.buildWeaponSidearm || this.buildWeaponGrenade;
        },

        buildActiveAmmo() {
            const map = { primary: this.buildAmmoPrimary, secondary: this.buildAmmoSecondary, sidearm: this.buildAmmoSidearm };
            return map[this.buildActiveWeaponTab] || null;
        },

        buildActiveWeaponIsGrenade() {
            const weapon = this.buildActiveWeapon;
            if (!weapon) return false;
            const items = this.categoryItems[GRENADE_SLUG] || [];
            return items.some(i => i.id === weapon.id);
        },

        buildWeaponStats() {
            const weapon = this.buildActiveWeapon;
            const ammo = this.buildActiveAmmo;
            if (!weapon) return null;

            const parseNum = (v) => {
                if (v == null || v === "") return null;
                return parseFloat(String(v).replace(/%$/, "")) || 0;
            };

            // Grenade stats — different fields, no ammo
            if (this.buildActiveWeaponIsGrenade) {
                const stats = [];
                for (const field of GRENADE_STAT_FIELDS) {
                    const val = parseNum(weapon[field]);
                    stats.push({ field, base: val, modifier: null, effective: val });
                }
                return { stats, ammoOnly: [] };
            }

            const stats = [];
            for (const field of WEAPON_STAT_FIELDS) {
                const base = parseNum(weapon[field]);
                let modifier = null;
                let effective = base;

                if (ammo && AMMO_MULTIPLIER_FIELDS.has(field)) {
                    const ammoVal = parseNum(ammo[field]);
                    if (ammoVal != null && base != null) {
                        if (field === "ui_inv_damage") {
                            // Raw multiplier
                            modifier = ammoVal;
                            effective = Math.round(base * ammoVal * 100) / 100;
                        } else {
                            // Percentage multiplier (e.g. "66%" means x0.66)
                            modifier = ammoVal / 100;
                            effective = Math.round(base * (ammoVal / 100) * 100) / 100;
                        }
                    }
                }
                stats.push({ field, base, modifier, effective });
            }

            // Malfunction chance (derived from reliability)
            const reli = parseNum(weapon["ui_inv_reli"]);
            if (reli != null) {
                const malf = malfunctionChance(reli);
                stats.push({ field: "_malfunction_chance", base: malf, modifier: null, effective: malf });
            }

            // Ammo-only stats
            const ammoOnly = [];
            if (ammo) {
                for (const field of AMMO_ONLY_FIELDS) {
                    const val = ammo[field];
                    if (val != null && val !== "") {
                        ammoOnly.push({ field, value: val });
                    }
                }
            }

            return { stats, ammoOnly };
        },

        buildInventorySorted() {
            const entries = this.buildInventory.map((e, i) => ({ ...e, originalIndex: i }));
            if (this.buildInventorySort === "name") {
                entries.sort((a, b) => (this.tName(a.item) || "").localeCompare(this.tName(b.item) || ""));
            } else if (this.buildInventorySort === "category") {
                const order = ["outfit", "helmet", "backpack", "belt", "artifact", "weapon", "sidearm", "grenade", "ammo"];
                entries.sort((a, b) => {
                    const ai = order.indexOf(a.slotType), bi = order.indexOf(b.slotType);
                    if (ai !== bi) return ai - bi;
                    return (this.tName(a.item) || "").localeCompare(this.tName(b.item) || "");
                });
            }
            return entries;
        },

        buildInventorySortLabel() {
            if (this.buildInventorySort === "name") return this.t("app_build_sort_name") || "Name";
            if (this.buildInventorySort === "category") return this.t("app_build_sort_category") || "Type";
            return "";
        },

        weaponCompareSlotCount() {
            return (this.buildWeaponPrimary ? 1 : 0) + (this.buildWeaponSecondary ? 1 : 0) + (this.buildWeaponSidearm ? 1 : 0);
        },

        buildPickerAmmoWeapon() {
            if (!this.buildPickerSlot || this.buildPickerSlot.type !== "ammo") return null;
            const map = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm };
            return map[this.buildPickerSlot.index] || null;
        },

        buildPickerSlotLabel() {
            if (!this.buildPickerSlot) return "";
            if (this.buildPickerSlot.type === "inventory") return this.t("app_build_inventory");
            if (this.buildPickerSlot.type === "backpack") return this.t("app_type_backpack");
            if (this.buildPickerSlot.type === "weapon") return this.t("app_build_weapon");
            if (this.buildPickerSlot.type === "sidearm") return this.t("app_build_sidearm");
            if (this.buildPickerSlot.type === "grenade") return this.t("app_build_grenade");
            if (this.buildPickerSlot.type === "ammo") return this.t("app_build_ammo");
            const cat = BUILD_SLOT_CATEGORIES[this.buildPickerSlot.type] || "";
            return this.t(SINGULAR_CATEGORY[cat] || cat);
        },

        buildPickerItems() {
            if (!this.buildPickerSlot) return [];
            const slotType = this.buildPickerSlot.type;

            const searchOrSort = (items) => {
                if (!this.buildPickerQuery.trim() || !this.buildPickerFuse) {
                    return items.slice().sort((a, b) => (this.tName(a) || "").localeCompare(this.tName(b) || ""));
                }
                const allowed = new Set(items);
                return this.buildPickerFuse.search(this.buildPickerQuery).map(r => r.item).filter(i => allowed.has(i));
            };

            const collectSlugs = (slugs) => {
                let items = [];
                for (const slug of slugs) items = items.concat(this.categoryItems[slug] || []);
                if (this.hideNoDrop) items = items.filter(i => i.hasNpcWeaponDrop !== false);
                return items;
            };

            if (slotType === "inventory") {
                return searchOrSort(collectSlugs(["outfits", "helmets", "belt-attachments", "artefacts", ...WEAPON_CATEGORY_SLUGS, GRENADE_SLUG, "ammo"]));
            }

            if (slotType === "weapon") {
                return searchOrSort(collectSlugs(PRIMARY_WEAPON_SLUGS));
            }

            if (slotType === "sidearm") {
                return searchOrSort(collectSlugs(SIDEARM_SLUGS));
            }

            if (slotType === "grenade") {
                return searchOrSort(collectSlugs([GRENADE_SLUG]));
            }

            if (slotType === "ammo") {
                const weaponMap = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm };
                const weapon = weaponMap[this.buildPickerSlot.index] || null;
                return searchOrSort(weapon ? this.getCompatibleAmmo(weapon) : []);
            }

            if (slotType === "belt") {
                const beltItems = (this.categoryItems["belt-attachments"] || []).filter(i => !isBackpack(i));
                const artItems = this.categoryItems["artefacts"] || [];
                let items = beltItems.concat(artItems);
                if (this.hideNoDrop) items = items.filter(i => i.hasNpcWeaponDrop !== false);
                return searchOrSort(items);
            }

            const cat = BUILD_SLOT_CATEGORIES[slotType];
            if (!cat) return [];
            const slug = categorySlug(cat);
            let items = this.categoryItems[slug] || [];
            if (this.hideNoDrop) items = items.filter(i => i.hasNpcWeaponDrop !== false);
            if (slotType === "backpack") items = items.filter(i => isBackpack(i));
            return searchOrSort(items);
        },
    },

    methods: {
        t(key) {
            if (!key) return key;
            const k = key.toLowerCase();
            const app = this.appTranslations;
            return this.translations?.[this.locale]?.[k]
                ?? this.translations?.en?.[k]
                ?? app?.[this.locale]?.[k]
                ?? app?.en?.[k]
                ?? key;
        },

        tCat(name) {
            return this.t(CATEGORY_KEYS[name] || name);
        },

        tCatSingular(name) {
            return this.t(SINGULAR_CATEGORY[name] || CATEGORY_KEYS[name] || name);
        },

        tUnit(key) {
            if (!key) return "";
            const unitKey = UNITS[key];
            if (!unitKey) return "";
            return this.t(unitKey);
        },

        tName(item) {
            if (!item) return "";
            const nameKey = item.pda_encyclopedia_name || item.name;
            const translated = this.t(nameKey);
            const display = item.displayName || nameKey;
            const bracket = display.lastIndexOf(" [");
            if (bracket >= 0) return translated + display.slice(bracket);
            return translated;
        },

        rebuildGlobalFuse() {
            if (!this.index.length) return;
            for (const item of this.index) {
                item.localeName = this.tName(item);
            }
            this.fuse = new Fuse(this.index, {
                keys: ["localeName", "id"],
                threshold: 0.35,
            });
        },

        rebuildCategoryFuse() {
            for (const [slug, items] of Object.entries(this.categoryItems)) {
                for (const item of items) {
                    item.localeName = this.tName(item);
                }
                this.categoryFuse[slug] = new Fuse(items, {
                    keys: ["localeName", "displayName", "pda_encyclopedia_name", "id", "ui_ammo_types", "st_data_export_ammo_types_alt"],
                    threshold: 0.35,
                });
            }
        },

        onLocaleChange() {
            localStorage.setItem("locale", this.locale);
            this.pushUrlState();
            this.$nextTick(() => {
                this.rebuildGlobalFuse();
                this.rebuildCategoryFuse();
            });
        },

        dataUrl(filename) {
            const v = this.fileManifest[filename];
            return `${this.dataBasePath}/${filename}${v ? '?v=' + v : ''}`;
        },

        isVirtualCategoryAvailable(cat) {
            if (cat === CAT.TOOLKIT_RATES) return !!this.fileManifest["toolkit-rates.json"];
            return true;
        },

        async fetchJsonCached(cacheKey, filename) {
            if (this[cacheKey] !== null) return this[cacheKey];
            try {
                const res = await fetch(this.dataUrl(filename));
                this[cacheKey] = res.ok ? await res.json() : {};
            } catch {
                this[cacheKey] = {};
            }
            return this[cacheKey];
        },

        fetchCalibers() {
            return this.fetchJsonCached("calibersCache", "calibers.json");
        },

        fetchDrops() {
            return this.fetchJsonCached("dropsCache", "drops.json");
        },

        fetchItemDrops() {
            return this.fetchJsonCached("itemDropsCache", "item-drops.json");
        },

        fetchRecipes() {
            return this.fetchJsonCached("recipesCache", "recipes.json");
        },

        fetchDisassemble() {
            return this.fetchJsonCached("disassembleCache", "disassemble.json");
        },

        fetchAmmoWeapons() {
            return this.fetchJsonCached("ammoWeaponsCache", "ammo-weapons.json");
        },

        findItemByName(name) {
            return this.index.find(i => i.name === name || i.displayName === name || i.pda_encyclopedia_name === name);
        },

        findFullItemByName(name) {
            for (const items of Object.values(this.categoryItems)) {
                const match = items.find(i => i.name === name || i.displayName === name || i.pda_encyclopedia_name === name);
                if (match) return match;
            }
            return null;
        },

        async loadItemById(id) {
            const indexRes = await fetch(this.dataUrl("index.json"));
            const index = await indexRes.json();
            const entry = index.find((i) => i.id === id);
            if (!entry) return null;

            const slug = categorySlug(entry.category);
            const catRes = await fetch(this.dataUrl(`${slug}.json`));
            const catData = await catRes.json();
            const item = catData.items.find((i) => i.id === id);

            const drops = await this.fetchDrops();

            return {
                item,
                category: entry.category,
                headers: catData.headers,
                drops: drops[id] || null,
            };
        },

        startContentLoading() {
            this.loading = true;
            clearTimeout(this._spinnerTimer);
            this._spinnerShownAt = null;
            this._spinnerTimer = setTimeout(() => {
                if (this.loading) {
                    this.showContentSpinner = true;
                    this._spinnerShownAt = Date.now();
                }
            }, 500);
        },

        async stopContentLoading() {
            this.loading = false;
            clearTimeout(this._spinnerTimer);
            if (this._spinnerShownAt) {
                const elapsed = Date.now() - this._spinnerShownAt;
                if (elapsed < 2000) {
                    this.loading = true;
                    await new Promise(r => setTimeout(r, 2000 - elapsed));
                    this.loading = false;
                }
            }
            this.showContentSpinner = false;
            this._spinnerShownAt = null;
        },

        async loadPackData() {
            this.loading = true;
            try {
                try {
                    const mRes = await fetch(`${this.dataBasePath}/manifest.json`, { cache: "no-cache" });
                    this.fileManifest = mRes.ok ? await mRes.json() : {};
                } catch { this.fileManifest = {}; }
                const [indexRes, catRes, trRes, dlRes] = await Promise.all([
                    fetch(this.dataUrl("index.json")),
                    fetch(this.dataUrl("categories.json")),
                    fetch(this.dataUrl("translations.json")),
                    fetch(this.dataUrl("display-labels.json")),
                ]);
                try { this.translations = trRes.ok ? await trRes.json() : null; } catch { this.translations = null; }
                try { this.displayLabels = dlRes.ok ? await dlRes.json() : {}; } catch { this.displayLabels = {}; }
                this.index = await indexRes.json();
                this.categories = catRes.ok
                    ? await catRes.json()
                    : [...new Set(this.index.map((i) => i.category))].sort();
                const catSet = new Set(this.categories);
                this.groupedCategories = CATEGORY_GROUPS
                    .map((g) => ({
                        name: g.name,
                        categories: g.categories.filter((c) => catSet.has(c) || (VIRTUAL_CATEGORIES.has(c) && this.isVirtualCategoryAvailable(c))),
                    }))
                    .filter((g) => g.categories.length > 0);
                this.rebuildGlobalFuse();
                if (this.groupedCategories.length > 0) {
                    const pathParsed = parsePathUrl(window.location.pathname);
                    const urlCat = pathParsed.cat || new URLSearchParams(window.location.search).get("cat");
                    if (urlCat === "build-planner" || pathParsed.buildPlanner) {
                        // Defer to mounted handler
                    } else if (urlCat === "favorites" || pathParsed.favorites) {
                        this.favoritesViewActive = true;
                        this.activeCategory = null;
                        this.sortCol = "pda_encyclopedia_name";
                    } else if (urlCat === "recent" || pathParsed.recent) {
                        this.recentViewActive = true;
                        this.activeCategory = null;
                        this.sortCol = "pda_encyclopedia_name";
                    } else {
                        const match = urlCat && (this.categories.find(c => categorySlug(c) === urlCat) || [...VIRTUAL_CATEGORIES].find(c => categorySlug(c) === urlCat));
                        await this.selectCategory(match || this.groupedCategories[0].categories[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to load index:", e);
            }
            this.calibers = await this.fetchCalibers();
            this.rebuildGlobalFuse();
            this.loading = false;
            const preloader = document.getElementById('app-preloader');
            if (preloader) {
                const card = preloader.querySelector('.preloader-card');
                const cardVisible = card && getComputedStyle(card).opacity !== '0';
                if (cardVisible) {
                    preloader.style.animation = 'fadeOut 0.3s ease forwards';
                    preloader.addEventListener('animationend', () => preloader.remove());
                } else {
                    preloader.remove();
                }
            }
        },

        async switchPack() {
            this.packLoading = true;

            // Clear all caches
            this.categoryItems = {};
            this.categoryHeaders = {};
            this.categoryFuse = {};
            this.calibersCache = null;
            this.dropsCache = null;
            this.itemDropsCache = null;
            this.recipesCache = null;
            this.disassembleCache = null;
            this.ammoWeaponsCache = null;
            this.outfitExchange = null;
            this.displayLabels = {};
            this.translations = null;
            this.craftingTrees = [];
            this.index = [];
            this.calibers = {};
            this.globalQuery = "";
            this.globalResults = [];
            this.filterQuery = "";
            this.activeCategory = null;
            this.buildPlannerActive = false;
            this.buildOutfit = null;
            this.buildHelmet = null;
            this.buildBackpack = null;
            this.buildBelts = [];
            this.buildArtifacts = [];
            this.buildInventory = [];
            this.crossPackId = null;
            this.crossPackItem = null;
            this.crossPackCache = {};

            // Save selection
            localStorage.setItem("selectedPack", this.activePack.id);

            // Update URL (clears stale filter/sort params)
            this.pushUrlState(true);

            // Update title
            document.title = `Stalker Anomaly Tools [${this.activePack.name}]`;

            // Migrate pins to scoped key
            this.loadScopedPins();
            this.loadFavorites();

            // Reload data
            await this.loadPackData();
            this.packLoading = false;
        },

        getPinStorageKey() {
            if (!this.activePack) return "pinnedIds";
            return `pinnedIds:${this.activePack.id}`;
        },

        loadScopedPins() {
            try {
                const saved = localStorage.getItem(this.getPinStorageKey());
                if (saved) {
                    this.pinnedIds = JSON.parse(saved);
                } else {
                    this.pinnedIds = [];
                }
            } catch (e) {
                this.pinnedIds = [];
            }
        },

        globalSearch() {
            if (!this.globalQuery.trim()) {
                this.globalResults = [];
                return;
            }
            this.globalResults = this.fuse
                .search(this.globalQuery)
                .slice(0, 50)
                .map((r) => r.item);
        },

        async selectCategory(cat) {
            // Save current category's filters before switching
            if (this.activeCategory && this.activePack) {
                saveCategoryFilters(this.activePack.id, categorySlug(this.activeCategory), {
                    activeFilters: JSON.parse(JSON.stringify(this.activeFilters)),
                    filterQuery: this.filterQuery,
                    sortCol: this.sortCol,
                    sortAsc: this.sortAsc,
                    exchangeFactionFilter: this.exchangeFactionFilter,
                    includeAltAmmo: this.includeAltAmmo,
                });
            }

            const previousCategory = this.activeCategory;

            this.buildPlannerActive = false;
            this.favoritesViewActive = false;
            this.recentViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = cat;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.exchangeFactionFilter = null;
            this.activeFilters = {};
            this.includeAltAmmo = false;
            if (this.$refs.filterBar) this.$refs.filterBar.closeFilterPanel();
            this.sidebarOpen = false;

            // Restore saved filters for the new category
            if (this.activePack) {
                const saved = loadCategoryFilters(this.activePack.id, categorySlug(cat));
                if (saved) {
                    this.activeFilters = saved.activeFilters || {};
                    this.filterQuery = saved.filterQuery || "";
                    this.filterInput = this.filterQuery;
                    this.sortCol = saved.sortCol || "pda_encyclopedia_name";
                    this.sortAsc = saved.sortAsc !== undefined ? saved.sortAsc : true;
                    this.exchangeFactionFilter = saved.exchangeFactionFilter || null;
                    this.includeAltAmmo = saved.includeAltAmmo || false;
                }
            }
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
            this.$nextTick(() => this.checkCallouts());

            if (cat === CAT.ALL_WEAPONS) {
                const slug = "all-weapons";
                if (this.categoryItems[slug]) return;

                this.startContentLoading();
                try {
                    const fetches = WEAPON_CATEGORIES.map(c => {
                        const s = categorySlug(c);
                        if (this.categoryItems[s]) {
                            return Promise.resolve({
                                category: c,
                                headers: this.categoryHeaders[s],
                                items: this.categoryItems[s],
                            });
                        }
                        return fetch(this.dataUrl(`${s}.json`)).then(r => r.json());
                    });
                    const results = await Promise.all(fetches);

                    // Build union of headers, insert "Type" after "Name"
                    const headerSet = new Set();
                    const headerOrder = [];
                    for (const r of results) {
                        for (const h of r.headers) {
                            if (!headerSet.has(h)) {
                                headerSet.add(h);
                                headerOrder.push(h);
                            }
                        }
                    }
                    const nameIdx = headerOrder.indexOf("pda_encyclopedia_name");
                    headerOrder.splice(nameIdx + 1, 0, "Type");

                    // Merge items with Type field, cache individual categories
                    const allItems = [];
                    for (const r of results) {
                        const type = r.category;
                        for (const item of r.items) {
                            item.localeName = this.tName(item);
                            allItems.push({ ...item, Type: type });
                        }
                        const s = categorySlug(r.category);
                        if (!this.categoryItems[s]) {
                            this.categoryItems[s] = r.items;
                            this.categoryHeaders[s] = r.headers;
                        }
                    }

                    this.categoryItems[slug] = allItems;
                    this.categoryHeaders[slug] = headerOrder;
                    this.categoryFuse[slug] = new Fuse(allItems, {
                        keys: ["displayName", "pda_encyclopedia_name", "localeName", "id", "ui_ammo_types", "st_data_export_ammo_types_alt", "Type"],
                        threshold: 0.35,
                    });
                } catch (e) {
                    console.error("Failed to load All Weapons:", e);
                    this.categoryItems[slug] = [];
                    this.categoryHeaders[slug] = [];
                }
                await this.stopContentLoading();
                return;
            }

            if (cat === CAT.OUTFIT_EXCHANGE) {
                if (!this.outfitExchange) {
                    this.startContentLoading();
                    try {
                        const res = await fetch(this.dataUrl("outfit-exchange.json"));
                        this.outfitExchange = res.ok ? await res.json() : null;
                    } catch (e) {
                        console.error("Failed to load outfit exchange:", e);
                        this.outfitExchange = null;
                    }
                    await this.stopContentLoading();
                }
                return;
            }

            if (cat === CAT.TOOLKIT_RATES) {
                if (!this.toolkitRates) {
                    this.startContentLoading();
                    try {
                        const res = await fetch(this.dataUrl("toolkit-rates.json"));
                        this.toolkitRates = res.ok ? await res.json() : null;
                    } catch (e) {
                        console.error("Failed to load toolkit rates:", e);
                        this.toolkitRates = null;
                    }
                    await this.stopContentLoading();
                }
                return;
            }

            if (cat === CAT.CRAFTING_TREES) {
                this.startContentLoading();
                try {
                    if (this.craftingTrees.length === 0) {
                        const recipesData = await this.fetchRecipes();
                        this.buildCraftingTreeData(recipesData);
                    }
                    // Ensure artefacts + ingredient categories are loaded so tree view can show full item stats
                    const slugsToLoad = [
                        categorySlug(CAT.ARTEFACTS),
                        categorySlug(CAT.MUTANT_PARTS),
                        categorySlug(CAT.MATERIALS),
                    ];
                    const fetches = slugsToLoad
                        .filter(s => !this.categoryItems[s])
                        .map(async (s) => {
                            try {
                                const res = await fetch(this.dataUrl(`${s}.json`));
                                if (!res.ok) return;
                                const data = await res.json();
                                for (const item of data.items) {
                                    item.localeName = this.tName(item);
                                }
                                this.categoryItems[s] = data.items;
                                this.categoryHeaders[s] = data.headers;
                                this.categoryFuse[s] = new Fuse(data.items, {
                                    keys: ["displayName", "pda_encyclopedia_name", "localeName", "id"],
                                    threshold: 0.35,
                                });
                            } catch { /* ignore missing categories */ }
                        });
                    await Promise.all(fetches);
                } catch (e) {
                    console.error("Failed to load crafting trees:", e);
                }
                await this.stopContentLoading();
                // Only reset expansion state when navigating TO crafting trees from another page.
                // If we're already on crafting trees (e.g. returning from a modal), preserve the state.
                if (previousCategory !== CAT.CRAFTING_TREES) {
                    this.craftingTreeExpandAll = false;
                    this.craftingTreeExpanded = new Set();
                }
                return;
            }

            const slug = categorySlug(cat);
            if (this.categoryItems[slug]) {
                if (slug === 'ammo') this.fetchAmmoWeapons();
                return;
            }

            this.startContentLoading();
            try {
                const res = await fetch(this.dataUrl(`${slug}.json`));
                const data = await res.json();
                for (const item of data.items) {
                    item.localeName = this.tName(item);
                }
                this.categoryItems[slug] = data.items;
                this.categoryHeaders[slug] = data.headers;
                this.categoryFuse[slug] = new Fuse(data.items, {
                    keys: ["displayName", "pda_encyclopedia_name", "localeName", "id", "ui_ammo_types", "st_data_export_ammo_types_alt"],
                    threshold: 0.35,
                });
            } catch (e) {
                console.error(`Failed to load category ${cat}:`, e);
                this.categoryItems[slug] = [];
                this.categoryHeaders[slug] = [];
            }
            await this.stopContentLoading();

            // Eager-load ammo-weapons data for filtering
            if (slug === 'ammo') this.fetchAmmoWeapons();
        },

        async openItem(id) {
            this.modalLoading = true;
            this.modalOpen = true;
            this.modalItem = null;
            this.modalDrops = null;
            this.modalItemDrops = null;
            this.modalRecipeData = null;
            this.modalDisassemble = null;
            this.modalAmmoWeapons = null;
            this._ammoDecCache = {};
            this.copyIdFeedback = false;
            this.copyModalLinkFeedback = false;
            this.crossPackItem = null;
            this.crossPackNotFound = false;
            document.body.style.overflow = "hidden";

            try {
                const entry = this.index.find((i) => i.id === id);
                if (!entry) {
                    this.modalLoading = false;
                    return;
                }
                this.addRecent(id);

                this.modalCategory = entry.category;
                const slug = categorySlug(entry.category);

                if (!this.categoryItems[slug]) {
                    const res = await fetch(this.dataUrl(`${slug}.json`));
                    const data = await res.json();
                    this.categoryItems[slug] = data.items;
                    this.categoryHeaders[slug] = data.headers;
                }

                this.modalHeaders = this.categoryHeaders[slug];
                this.modalItem = this.categoryItems[slug].find((i) => i.id === id);

                const [drops, itemDrops, recipeData, disassemble, ammoWeapons] = await Promise.all([
                    this.fetchDrops(),
                    this.fetchItemDrops(),
                    this.fetchRecipes(),
                    this.fetchDisassemble(),
                    this.fetchAmmoWeapons(),
                ]);
                this.modalDrops = drops[id] || null;
                this.modalItemDrops = itemDrops[id] || null;
                this.modalRecipeData = recipeData;
                this.modalDisassemble = disassemble[id] || null;
                this.modalAmmoWeapons = ammoWeapons[id] || null;
            } catch (e) {
                console.error("Failed to load item:", e);
            }
            this.modalLoading = false;
            if (this.crossPackId) this.loadCrossPackItem(this.crossPackId);
            this.$nextTick(() => this.checkCallouts());
        },

        showToast(message, type = "error", duration = 3000) {
            this.toastMessage = message;
            this.toastType = type;
            setTimeout(() => { this.toastMessage = ""; }, duration);
        },

        async copyToClipboard(text, feedbackKey) {
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const ta = document.createElement("textarea");
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
            this[feedbackKey] = true;
            setTimeout(() => { this[feedbackKey] = false; }, 1500);
        },

        async copyItemId(id) {
            await this.copyToClipboard(id, "copyIdFeedback");
        },

        async copyModalLink() {
            await this.copyToClipboard(window.location.href, "copyModalLinkFeedback");
        },

        closeModal() {
            this.modalOpen = false;
            this.modalItem = null;
            document.body.style.overflow = "";
            if (window.location.hash) {
                history.pushState(null, "", window.location.pathname + window.location.search);
            }
        },

        async loadCrossPackItem(packId) {
            if (!packId || !this.modalItem) {
                this.crossPackItem = null;
                this.crossPackHeaders = [];
                this.crossPackNotFound = false;
                return;
            }
            this.crossPackLoading = true;
            this.crossPackNotFound = false;
            this.crossPackItem = null;
            try {
                const basePath = `data/${packId}`;
                const indexKey = `${packId}/_index`;
                if (!this.crossPackCache[indexKey]) {
                    const res = await fetch(`${basePath}/index.json`);
                    if (!res.ok) throw new Error("Index not found");
                    this.crossPackCache[indexKey] = await res.json();
                }
                const index = this.crossPackCache[indexKey];
                const entry = index.find(i => i.id === this.modalItem.id);
                if (!entry) { this.crossPackNotFound = true; this.crossPackLoading = false; return; }
                const slug = categorySlug(entry.category);
                const catKey = `${packId}/${slug}`;
                if (!this.crossPackCache[catKey]) {
                    const res = await fetch(`${basePath}/${slug}.json`);
                    if (!res.ok) throw new Error("Category not found");
                    this.crossPackCache[catKey] = await res.json();
                }
                const catData = this.crossPackCache[catKey];
                this.crossPackHeaders = catData.headers;
                this.crossPackItem = catData.items.find(i => i.id === this.modalItem.id) || null;
                if (!this.crossPackItem) this.crossPackNotFound = true;
            } catch (e) {
                console.error("Cross-pack comparison load failed:", e);
                this.crossPackNotFound = true;
            }
            this.crossPackLoading = false;
        },

        computeStatDiff(key, currentVal, otherVal) {
            if (otherVal === undefined || otherVal === null || otherVal === "") return null;
            if (currentVal === undefined || currentVal === null || currentVal === "") return null;
            const curStr = String(currentVal);
            const othStr = String(otherVal);
            if (curStr === othStr) return { type: "same" };
            const isPct = curStr.includes("%") || othStr.includes("%");
            const curN = parseFloat(curStr.replace(/%$/, ""));
            const othN = parseFloat(othStr.replace(/%$/, ""));
            if (isNaN(curN) || isNaN(othN)) return { type: "changed" };
            const delta = curN - othN;
            if (delta === 0) return { type: "same" };
            return { type: delta > 0 ? "higher" : "lower", delta, isPct };
        },

        formatDiffDelta(diff) {
            if (!diff || diff.type === "same") return "";
            if (diff.type === "changed") return "\u2260";
            const arrow = diff.delta > 0 ? "\u25B2" : "\u25BC";
            const val = parseFloat(Math.abs(diff.delta).toFixed(2));
            return arrow + " " + val + (diff.isPct ? "%" : "");
        },

        diffClass(diff) {
            if (!diff || diff.type === "same") return "";
            if (diff.type === "changed") return "stat-diff-changed";
            return diff.type === "higher" ? "stat-diff-up" : "stat-diff-down";
        },

        pickComparePack(id) {
            this.crossPackId = id;
        },

        closeCompareMenu() {
            // compareMenuOpen is now local state in child components
        },

        exportVersionCompare() {
            if (!this.versionCompareResults.length) return;
            const rows = [["Category", "Item ID", "Item Name", "Field", "Old Value", "New Value"].join(",")];
            for (const group of this.versionCompareResults) {
                const cat = this.tCat(group.category);
                for (const item of group.items) {
                    for (const d of item.diffs) {
                        const label = this.headerLabel(d.key);
                        const oldVal = this.formatValue(d.key, d.oldVal);
                        const newVal = this.formatValue(d.key, d.newVal);
                        rows.push([cat, item.id, `"${item.name.replace(/"/g, '""')}"`, label, `"${oldVal}"`, `"${newVal}"`].join(","));
                    }
                }
            }
            const blob = new Blob([rows.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `version-compare-${this.activePack.id}-vs-${this.crossPackId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        },

        openVersionCompare() {
            this.resetViewState();
            this.versionCompareActive = true;
            this.pushUrlState(true);
            if (this.crossPackId) this.loadVersionCompareData();
        },

        async loadVersionCompareData() {
            if (!this.crossPackId) { this.versionCompareResults = []; return; }
            this.versionCompareLoading = true;
            try {
                const packId = this.crossPackId;
                const basePath = `data/${packId}`;
                const indexKey = `${packId}/_index`;
                if (!this.crossPackCache[indexKey]) {
                    const res = await fetch(`${basePath}/index.json`);
                    this.crossPackCache[indexKey] = await res.json();
                }
                const otherIndex = this.crossPackCache[indexKey];
                const otherById = Object.fromEntries(otherIndex.map(i => [i.id, i]));
                const currentById = Object.fromEntries(this.index.map(i => [i.id, i]));

                // Find all categories that have shared items
                const categoryPairs = new Map();
                for (const item of this.index) {
                    if (otherById[item.id]) {
                        const slug = categorySlug(item.category);
                        if (!categoryPairs.has(slug)) categoryPairs.set(slug, item.category);
                    }
                }

                // Load category data for both packs
                const slugs = [...categoryPairs.keys()];
                await Promise.all(slugs.map(async (slug) => {
                    if (!this.categoryItems[slug]) {
                        const res = await fetch(this.dataUrl(`${slug}.json`));
                        const data = await res.json();
                        this.categoryItems[slug] = data.items;
                        this.categoryHeaders[slug] = data.headers;
                    }
                    const catKey = `${packId}/${slug}`;
                    if (!this.crossPackCache[catKey]) {
                        const res = await fetch(`${basePath}/${slug}.json`);
                        if (res.ok) this.crossPackCache[catKey] = await res.json();
                    }
                }));

                // Diff all shared items
                const groups = [];
                for (const [slug, category] of categoryPairs) {
                    const catKey = `${packId}/${slug}`;
                    const otherCat = this.crossPackCache[catKey];
                    if (!otherCat || !this.categoryItems[slug]) continue;
                    const otherItems = Object.fromEntries(otherCat.items.map(i => [i.id, i]));
                    const headers = this.categoryHeaders[slug] || [];
                    const changedItems = [];
                    for (const item of this.categoryItems[slug]) {
                        const other = otherItems[item.id];
                        if (!other) continue;
                        const diffs = [];
                        for (const h of headers) {
                            if (SKIP_KEYS.has(h) || MODAL_BADGE_KEYS.has(h)) continue;
                            if (h === "name" || h === "displayName") continue;
                            const curVal = item[h];
                            const othVal = other[h];
                            const diff = this.computeStatDiff(h, curVal, othVal);
                            if (diff && diff.type !== "same") {
                                diffs.push({ key: h, oldVal: othVal, newVal: curVal, type: diff.type });
                            }
                        }
                        if (diffs.length > 0) {
                            diffs.sort((a, b) => {
                                const impactA = a.type === "changed" ? 0 : Math.abs(a.newVal && a.oldVal ? (parseFloat(String(a.newVal).replace("%","")) - parseFloat(String(a.oldVal).replace("%",""))) / (parseFloat(String(a.oldVal).replace("%","")) || 1) : 0);
                                const impactB = b.type === "changed" ? 0 : Math.abs(b.newVal && b.oldVal ? (parseFloat(String(b.newVal).replace("%","")) - parseFloat(String(b.oldVal).replace("%",""))) / (parseFloat(String(b.oldVal).replace("%","")) || 1) : 0);
                                return impactB - impactA;
                            });
                            changedItems.push({ id: item.id, name: this.tName(item), category, diffs });
                        }
                    }
                    if (changedItems.length > 0) {
                        changedItems.sort((a, b) => a.name.localeCompare(b.name));
                        groups.push({ category, items: changedItems });
                    }
                }
                groups.sort((a, b) => a.category.localeCompare(b.category));
                this.versionCompareResults = groups;
            } catch (e) {
                console.error("Version compare load failed:", e);
                this.versionCompareResults = [];
            }
            this.versionCompareLoading = false;
        },

        navigateModal(direction) {
            if (!this.modalOpen || !this.modalItem || this.modalLoading) return;
            const items = this.sortedItems;
            if (!items.length) return;
            const idx = items.findIndex(i => i.id === this.modalItem.id);
            if (idx < 0) return;
            const newIdx = (idx + direction + items.length) % items.length;
            this.navigateToItem(items[newIdx].id);
        },

        togglePin(id) {
            const idx = this.pinnedIds.indexOf(id);
            if (idx >= 0) {
                this.pinnedIds.splice(idx, 1);
            } else {
                if (this.pinnedIds.length >= MAX_PINS) return;
                this.pinnedIds.push(id);
            }
            this.savePins();
        },

        isPinned(id) {
            return this.pinnedIds.includes(id);
        },

        clearPins() {
            this.pinnedIds = [];
            this.savePins();
            this.compareOpen = false;
        },

        savePins() {
            localStorage.setItem(this.getPinStorageKey(), JSON.stringify(this.pinnedIds));
        },

        // Favorites
        getFavStorageKey() {
            if (!this.activePack) return "favorites";
            return `favorites:${this.activePack.id}`;
        },

        toggleFavorite(id) {
            const idx = this.favoriteIds.indexOf(id);
            if (idx >= 0) {
                this.favoriteIds.splice(idx, 1);
            } else {
                this.favoriteIds.push(id);
            }
            this.saveFavorites();
        },

        isFavorited(id) {
            return this.favoriteIds.includes(id);
        },

        saveFavorites() {
            localStorage.setItem(this.getFavStorageKey(), JSON.stringify(this.favoriteIds));
        },

        loadFavorites() {
            try {
                const saved = localStorage.getItem(this.getFavStorageKey());
                this.favoriteIds = saved ? JSON.parse(saved) : [];
            } catch (e) {
                this.favoriteIds = [];
            }
        },

        clearFavorites() {
            this.favoriteIds = [];
            this.saveFavorites();
            if (this.favoritesViewActive) {
                this.favoritesViewActive = false;
                if (this.groupedCategories.length > 0) {
                    this.selectCategory(this.groupedCategories[0].categories[0]);
                }
            }
        },

        resetViewState() {
            this.buildPlannerActive = false;
            this.versionCompareActive = false;
            this.favoritesViewActive = false;
            this.recentViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = null;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.activeFilters = {};
            if (this.$refs.filterBar) this.$refs.filterBar.closeFilterPanel();
            this.sidebarOpen = false;
        },

        selectFavorites() {
            this.resetViewState();
            this.favoritesViewActive = true;
            this.pushUrlState(true);
        },

        // Recent items
        getRecentStorageKey() {
            if (!this.activePack) return "recentIds";
            return `recentIds:${this.activePack.id}`;
        },

        saveRecent() {
            localStorage.setItem(this.getRecentStorageKey(), JSON.stringify(this.recentIds));
        },

        loadRecent() {
            try {
                const saved = localStorage.getItem(this.getRecentStorageKey());
                this.recentIds = saved ? JSON.parse(saved) : [];
            } catch (e) {
                this.recentIds = [];
            }
        },

        addRecent(id) {
            const idx = this.recentIds.indexOf(id);
            if (idx >= 0) this.recentIds.splice(idx, 1);
            this.recentIds.unshift(id);
            if (this.recentIds.length > 10) this.recentIds.length = 10;
            this.saveRecent();
        },

        selectRecent() {
            this.resetViewState();
            this.recentViewActive = true;
            this.pushUrlState(true);
        },

        async openCompare() {
            if (this.pinnedIds.length < 2) return;
            this.compareOpen = true;
            this.compareData = [];
            document.body.style.overflow = "hidden";

            const results = await Promise.all(this.pinnedIds.map((id) => this.loadItemById(id)));
            this.compareData = results.filter(Boolean);
        },

        closeCompare() {
            this.compareOpen = false;
            this.compareViewMode = "table";
            if (this._compareChart) { this._compareChart.destroy(); this._compareChart = null; }
            document.body.style.overflow = this.modalOpen ? "hidden" : "";
        },

        renderCompareChart() {
            const canvas = this.$refs.comparePanel ? this.$refs.comparePanel.getChartCanvas() : this.$refs.compareChartCanvas;
            if (!canvas || this.compareData.length === 0) return;
            if (this._compareChart) { this._compareChart.destroy(); this._compareChart = null; }

            const fields = this.compareRadarFields;
            if (fields.length === 0) return;

            // Use full category ranges so items are positioned relative to all items in the category
            const catRanges = {};
            const seenCategories = new Set(this.compareData.map(e => e.category));
            for (const cat of seenCategories) {
                const cr = this.getColumnRanges(cat);
                for (const [k, v] of Object.entries(cr)) {
                    if (!catRanges[k]) catRanges[k] = { min: v.min, max: v.max };
                    else {
                        if (v.min < catRanges[k].min) catRanges[k].min = v.min;
                        if (v.max > catRanges[k].max) catRanges[k].max = v.max;
                    }
                }
            }
            // Fallback: compute from compared items for fields missing from category ranges
            for (const f of fields) {
                if (catRanges[f]) continue;
                let min = Infinity, max = -Infinity;
                for (const entry of this.compareData) {
                    const n = parseFloat(String(entry.item[f] ?? "").replace("%", ""));
                    if (isNaN(n)) continue;
                    if (n < min) min = n;
                    if (n > max) max = n;
                }
                if (min !== Infinity) catRanges[f] = { min, max };
            }

            const normalize = (field, rawVal) => {
                const n = parseFloat(String(rawVal ?? "").replace("%", ""));
                if (isNaN(n)) return 0;
                const r = catRanges[field];
                if (!r || r.max === r.min) return 50;
                let norm = ((n - r.min) / (r.max - r.min)) * 100;
                if (LOWER_IS_BETTER.has(field) || HIGHER_IS_WORSE.has(field)) norm = 100 - norm;
                return Math.max(0, Math.min(100, norm));
            };

            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r},${g},${b},${alpha})`;
            };
            const labels = fields.map(f => this.headerLabel(f));
            const datasets = this.compareData.map((entry, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                return {
                    label: this.tName(entry.item),
                    data: fields.map(f => normalize(f, entry.item[f])),
                    borderColor: color,
                    backgroundColor: hexToRgba(color, 0.15),
                    pointBackgroundColor: color,
                    pointRadius: 3,
                    borderWidth: 2,
                    fill: true,
                };
            });

            const self = this;
            this._compareChart = new Chart(canvas, {
                type: "radar",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        r: {
                            min: 0, max: 100,
                            ticks: { display: false, stepSize: 20 },
                            grid: { color: "#2a2a2a" },
                            angleLines: { color: "#2a2a2a" },
                            pointLabels: { color: "#d4d4d4", font: { size: 11 } },
                        }
                    },
                    plugins: {
                        legend: { labels: { color: "#d4d4d4", font: { size: 12 }, usePointStyle: true, pointStyle: "circle" } },
                        tooltip: {
                            backgroundColor: "#1a1a1a",
                            titleColor: "#d4d4d4",
                            bodyColor: "#d4d4d4",
                            borderColor: "#2a2a2a",
                            borderWidth: 1,
                            callbacks: {
                                label(ctx) {
                                    const field = fields[ctx.dataIndex];
                                    const entry = self.compareData[ctx.datasetIndex];
                                    const rawVal = entry.item[field];
                                    const name = self.tName(entry.item);
                                    return `${name}: ${self.formatValue(field, rawVal ?? "--")}`;
                                }
                            }
                        }
                    }
                }
            });
        },

        renderBuildWeaponRadar() {
            const canvas = this.$refs.buildPlanner ? this.$refs.buildPlanner.getRadarCanvas() : this.$refs.buildWeaponRadarCanvas;
            if (!canvas) return;
            if (this._buildWeaponRadarChart) { this._buildWeaponRadarChart.destroy(); this._buildWeaponRadarChart = null; }

            const AP_FIELD = "st_data_export_ap";
            const fields = [...WEAPON_STAT_FIELDS, AP_FIELD];
            const parseNum = (v) => {
                if (v == null || v === "") return null;
                return parseFloat(String(v).replace(/%$/, "")) || 0;
            };

            // Collect all equipped weapons (excluding grenades)
            const grenadeItems = this.categoryItems[GRENADE_SLUG] || [];
            const slots = [
                { key: "primary", weapon: this.buildWeaponPrimary, ammo: this.buildAmmoPrimary, color: "#b85c5c", label: this.t("app_build_weapon_primary") || "Primary" },
                { key: "secondary", weapon: this.buildWeaponSecondary, ammo: this.buildAmmoSecondary, color: "#c8a84e", label: this.t("app_build_weapon_secondary") || "Secondary" },
                { key: "sidearm", weapon: this.buildWeaponSidearm, ammo: this.buildAmmoSidearm, color: "#5ba8a0", label: this.t("app_build_sidearm") || "Sidearm" },
            ].filter(s => s.weapon && !grenadeItems.some(i => i.id === s.weapon.id));

            if (slots.length === 0) return;

            // Merge ranges across all weapon categories for consistent normalization
            const allRanges = {};
            for (const s of slots) {
                const cat = WEAPON_CATEGORIES.find(c => {
                    const slug = categorySlug(c);
                    return (this.categoryItems[slug] || []).some(i => i.id === s.weapon.id);
                });
                if (cat) {
                    const cr = this.getColumnRanges(cat);
                    for (const [k, v] of Object.entries(cr)) {
                        if (!allRanges[k]) allRanges[k] = { min: v.min, max: v.max };
                        else {
                            if (v.min < allRanges[k].min) allRanges[k].min = v.min;
                            if (v.max > allRanges[k].max) allRanges[k].max = v.max;
                        }
                    }
                }
            }
            // Compute AP range from equipped ammo only (avoids outliers like batteries/warheads)
            let apMin = Infinity, apMax = -Infinity;
            for (const s of slots) {
                if (!s.ammo) continue;
                const ap = parseNum(s.ammo[AP_FIELD]);
                if (ap == null) continue;
                if (ap < apMin) apMin = ap;
                if (ap > apMax) apMax = ap;
            }
            if (apMin !== Infinity) {
                allRanges[AP_FIELD] = { min: Math.min(0, apMin), max: apMax };
            }

            const normalize = (field, val) => {
                if (val == null) return 0;
                const r = allRanges[field];
                if (!r || r.max === r.min) return 50;
                let norm = ((val - r.min) / (r.max - r.min)) * 100;
                if (LOWER_IS_BETTER.has(field) || HIGHER_IS_WORSE.has(field)) norm = 100 - norm;
                return Math.max(0, Math.min(100, norm));
            };

            // Compute effective stats per weapon
            const computeEffective = (weapon, ammo) => {
                return fields.map(f => {
                    if (f === AP_FIELD) return ammo ? parseNum(ammo[f]) : null;
                    const base = parseNum(weapon[f]);
                    if (base == null) return null;
                    if (!ammo || !AMMO_MULTIPLIER_FIELDS.has(f)) return base;
                    const ammoVal = parseNum(ammo[f]);
                    if (ammoVal == null) return base;
                    if (f === "ui_inv_damage") return Math.round(base * ammoVal * 100) / 100;
                    return Math.round(base * (ammoVal / 100) * 100) / 100;
                });
            };

            const datasets = [];
            const rawValues = [];
            for (const s of slots) {
                const effective = computeEffective(s.weapon, s.ammo);
                rawValues.push(effective);
                const label = this.tName(s.weapon);
                datasets.push({
                    label,
                    data: fields.map((f, i) => normalize(f, effective[i])),
                    borderColor: s.color,
                    backgroundColor: s.color + "26",
                    pointBackgroundColor: s.color,
                    pointRadius: 3,
                    borderWidth: 2,
                    fill: true,
                });
            }

            const labels = fields.map(f => this.headerLabel(f));
            const self = this;

            this._buildWeaponRadarChart = new Chart(canvas, {
                type: "radar",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        r: {
                            min: 0, max: 100,
                            ticks: { display: false, stepSize: 20 },
                            grid: { color: "#2a2a2a" },
                            angleLines: { color: "#2a2a2a" },
                            pointLabels: { color: "#d4d4d4", font: { size: 10 } },
                        }
                    },
                    plugins: {
                        legend: { display: true, labels: { color: "#d4d4d4", font: { size: 11 }, usePointStyle: true, pointStyle: "circle" } },
                        tooltip: {
                            backgroundColor: "#1a1a1a",
                            titleColor: "#d4d4d4",
                            bodyColor: "#d4d4d4",
                            borderColor: "#2a2a2a",
                            borderWidth: 1,
                            callbacks: {
                                label(ctx) {
                                    const field = fields[ctx.dataIndex];
                                    const val = rawValues[ctx.datasetIndex][ctx.dataIndex];
                                    return `${self.tName(slots[ctx.datasetIndex].weapon)}: ${self.formatValue(field, val ?? "--")}`;
                                }
                            }
                        }
                    }
                }
            });
        },

        buildCompareRow(label, values) {
            const parsed = values.map((v) => {
                if (v === "--") return NaN;
                return parseFloat(String(v).replace("%", ""));
            });
            const numerics = parsed.filter((n) => !isNaN(n));
            let best = null;
            let worst = null;
            if (numerics.length >= 2 && !NO_HIGHLIGHT.has(label)) {
                const lowerBetter = LOWER_IS_BETTER.has(label);
                const bestVal = lowerBetter ? Math.min(...numerics) : Math.max(...numerics);
                const worstVal = lowerBetter ? Math.max(...numerics) : Math.min(...numerics);
                if (bestVal !== worstVal) {
                    best = bestVal;
                    worst = worstVal;
                }
            }
            return { label, values, parsed, best, worst };
        },

        compareValueClass(row, idx) {
            if (row.best === null) return "";
            const v = row.parsed[idx];
            if (isNaN(v)) return "";
            if (v === row.best) return "stat-best";
            if (v === row.worst) return "stat-worst";
            return "";
        },

        compareValueIcon(row, idx) {
            if (row.best === null) return "";
            const v = row.parsed[idx];
            if (isNaN(v)) return "";
            if (v === row.best) return "\u25B2";
            if (v === row.worst) return "\u25BC";
            return "";
        },

        buildCraftingTreeData(recipesData) {
            const recipes = recipesData.items || [];
            const recipeMap = {};
            for (const r of recipes) {
                recipeMap[r.pda_encyclopedia_name || r.displayName] = r;
            }
            const buildNode = (name, amount, visited) => {
                const node = { name, amount, children: [], isRaw: true };
                const recipe = recipeMap[name];
                if (recipe && !visited.has(name)) {
                    visited.add(name);
                    node.isRaw = false;
                    node.id = recipe.id;
                    for (const ing of recipe.ingredients) {
                        node.children.push(buildNode(ing.name, ing.amount, new Set(visited)));
                    }
                }
                return node;
            };
            this.craftingTrees = recipes.map(r => {
                const tree = buildNode(r.pda_encyclopedia_name || r.displayName, "x1", new Set());
                tree.id = r.id;
                return tree;
            }).sort((a, b) => a.name.localeCompare(b.name));
        },

        flattenTree(tree) {
            const rows = [];
            const walk = (node, depth, parentPath) => {
                const path = parentPath ? `${parentPath}/${node.name}` : node.name;
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = this.craftingTreeExpandAll || this.craftingTreeExpanded.has(path);
                rows.push({
                    name: node.name,
                    id: node.id || null,
                    amount: node.amount,
                    depth,
                    hasChildren,
                    isExpanded,
                    path,
                    isRaw: node.isRaw,
                    itemRef: this.findItemByName(node.name),
                });
                if (hasChildren && isExpanded) {
                    for (const child of node.children) {
                        walk(child, depth + 1, path);
                    }
                }
            };
            if (tree.children) {
                for (const child of tree.children) {
                    walk(child, 0, "");
                }
            }
            return rows;
        },

        toggleTreeNode(path) {
            if (this.craftingTreeExpandAll) {
                // Switch from expand-all to manual mode, copy all currently visible paths
                this.craftingTreeExpandAll = false;
                // Expand all paths except the one being toggled
                const allPaths = new Set();
                for (const tree of this.filteredCraftingTrees) {
                    const collectPaths = (node, parentPath) => {
                        const p = parentPath ? `${parentPath}/${node.name}` : node.name;
                        if (node.children && node.children.length > 0) {
                            allPaths.add(p);
                            for (const child of node.children) collectPaths(child, p);
                        }
                    };
                    if (tree.children) {
                        for (const child of tree.children) collectPaths(child, "");
                    }
                }
                allPaths.delete(path);
                this.craftingTreeExpanded = allPaths;
            } else if (this.craftingTreeExpanded.has(path)) {
                this.craftingTreeExpanded.delete(path);
                // Force reactivity
                this.craftingTreeExpanded = new Set(this.craftingTreeExpanded);
            } else {
                this.craftingTreeExpanded.add(path);
                this.craftingTreeExpanded = new Set(this.craftingTreeExpanded);
            }
        },

        expandAllTrees() {
            this.craftingTreeExpandAll = true;
        },

        collapseAllTrees() {
            this.craftingTreeExpandAll = false;
            this.craftingTreeExpanded = new Set();
        },

        closeSettings() {
            if (this.$refs.filterBar) this.$refs.filterBar.closeSettings();
        },
        closeSortMenu() {
            if (this.$refs.filterBar) this.$refs.filterBar.closeSortMenu();
        },
        pickSort(col) {
            this.sortCol = col;
            this.pushUrlState();
        },

        closeFilterPanel() {
            if (this.$refs.filterBar) this.$refs.filterBar.closeFilterPanel();
        },

        toggleFilterPanel() {
            if (this.$refs.filterBar) this.$refs.filterBar.toggleFilterPanel();
        },

        closeDownloadMenu() {
            if (this.$refs.filterBar) this.$refs.filterBar.closeDownloadMenu();
        },

        buildExportColumns() {
            const cols = [];
            for (const col of this.tableColumns) {
                if (col.type === 'heal') {
                    for (const hg of col.groups) {
                        for (const f of hg.fields) {
                            cols.push({ key: f, label: f });
                        }
                    }
                } else {
                    cols.push({ key: col.key, label: this.headerLabel(col.key) });
                }
            }
            return cols;
        },

        downloadData(format) {
            if (this.isToolkitRates) return this.downloadToolkitRates(format);
            const cols = this.buildExportColumns();
            const rows = this.sortedItems;

            const getValue = (item, col) => {
                if (col.key === 'pda_encyclopedia_name' || col.key === 'name') {
                    return this.tName(item);
                }
                const v = this.cellValue(item, col.key);
                return v == null ? '' : v;
            };

            let blob, ext;
            if (format === 'csv') {
                const escapeCSV = (val) => {
                    const s = String(val);
                    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                        return '"' + s.replace(/"/g, '""') + '"';
                    }
                    return s;
                };
                const header = cols.map(c => escapeCSV(c.label)).join(',');
                const lines = rows.map(item =>
                    cols.map(c => escapeCSV(getValue(item, c))).join(',')
                );
                blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                ext = 'csv';
            } else {
                const data = rows.map(item => {
                    const obj = {};
                    for (const c of cols) {
                        obj[c.label] = getValue(item, c);
                    }
                    return obj;
                });
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
                ext = 'json';
            }

            const cat = (this.activeCategory || 'export').replace(/\s+/g, '_').toLowerCase();
            const pack = (this.activePack?.id || 'data').replace(/\s+/g, '_').toLowerCase();
            const filename = `${cat}_${pack}_${rows.length}.${ext}`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        downloadToolkitRates(format) {
            const maps = this.toolkitRatesSorted;
            const types = this.toolkitRates.toolTypes;
            const pack = (this.activePack?.id || 'data').replace(/\s+/g, '_').toLowerCase();
            const filename = `toolkit_rates_${pack}_${maps.length}.${format}`;
            let blob;
            if (format === 'csv') {
                const escapeCSV = (val) => {
                    const s = String(val);
                    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
                };
                const header = [this.t('app_label_map'), ...types.map(t => this.t(t))].map(escapeCSV).join(',');
                const lines = maps.map(m =>
                    [escapeCSV(this.t(m.id)), ...types.map(t => m.rates[t] ? m.rates[t] + '%' : '0%')].join(',')
                );
                blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            } else {
                const data = maps.map(m => {
                    const obj = { [this.t('app_label_map')]: this.t(m.id) };
                    for (const t of types) obj[this.t(t)] = m.rates[t] ? m.rates[t] + '%' : '0%';
                    return obj;
                });
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        applyFilters(items) {
            const entries = Object.entries(this.activeFilters);
            if (entries.length === 0) return items;
            return items.filter(item => {
                for (const [key, val] of entries) {
                    const def = FILTER_DEFS.find(d => d.key === key);
                    if (!def) {
                        // Range filter
                        if (Array.isArray(val) && val.length === 2 && (typeof val[0] === "number" || val[0] === null)) {
                            if (val[0] === null && val[1] === null) continue;
                            const raw = item[key];
                            if (raw == null || raw === "") return false;
                            const n = parseFloat(String(raw).replace(/%$/, ""));
                            if (isNaN(n)) return false;
                            if (val[0] !== null && n < val[0]) return false;
                            if (val[1] !== null && n > val[1]) return false;
                        }
                        continue;
                    }
                    if (def.type === "flag" && val === true) {
                        if (item[key] !== "Y") return false;
                    } else if (def.type === "flag" && val === false) {
                        if (item[key] === "Y") return false;
                    } else if (def.type === "has-effect" && Array.isArray(val) && val.length > 0) {
                        for (const field of val) {
                            if (!isNonZero(item[field])) return false;
                        }
                    } else if (Array.isArray(val) && val.length > 0) {
                        const itemVal = item[key];
                        if (key === "ui_ammo_types") {
                            const itemCals = String(itemVal || "").split(";").map(s => s.trim()).filter(Boolean);
                            if (this.includeAltAmmo) {
                                const altVal = item["st_data_export_ammo_types_alt"];
                                const altCals = String(altVal || "").split(";").map(s => s.trim()).filter(Boolean);
                                if (!val.some(v => itemCals.includes(v) || altCals.includes(v))) return false;
                            } else {
                                if (!val.some(v => itemCals.includes(v))) return false;
                            }
                        } else {
                            if (!val.includes(String(itemVal ?? ""))) return false;
                        }
                    }
                }
                return true;
            });
        },

        toggleDiscreteFilter(key, value) {
            const current = this.activeFilters[key];
            if (Array.isArray(current)) {
                const idx = current.indexOf(value);
                if (idx >= 0) {
                    current.splice(idx, 1);
                    if (current.length === 0) delete this.activeFilters[key];
                } else {
                    current.push(value);
                }
            } else {
                this.activeFilters[key] = [value];
            }
            this.pushUrlState();
        },

        toggleFlagFilter(key, value) {
            if (this.activeFilters[key] === value) {
                delete this.activeFilters[key];
            } else {
                this.activeFilters[key] = value;
            }
            this.pushUrlState();
        },

        isDiscreteActive(key, value) {
            const current = this.activeFilters[key];
            return Array.isArray(current) && current.includes(value);
        },

        stepRange(key, bound, delta) {
            const current = this.activeFilters[key];
            const idx = bound === "min" ? 0 : 1;
            const otherIdx = 1 - idx;
            const def = this.rangeFilters.find(d => d.key === key);
            const fallback = idx === 0 ? (def?.dataMin ?? 0) : (def?.dataMax ?? 0);
            const cur = Array.isArray(current) && current[idx] !== null ? current[idx] : fallback;
            const step = def?.step ?? 1;
            const next = parseFloat((cur + delta * step).toFixed(1));
            if (bound === "min") {
                this.setRangeMin(key, String(next));
            } else {
                this.setRangeMax(key, String(next));
            }
        },

        setRangeMin(key, value) {
            const n = value === "" ? null : parseFloat(value);
            const current = this.activeFilters[key];
            const max = Array.isArray(current) ? current[1] : null;
            if ((n === null || isNaN(n)) && max === null) {
                delete this.activeFilters[key];
            } else {
                this.activeFilters[key] = [isNaN(n) ? null : n, max];
            }
            this.debouncedPushUrl();
        },

        setRangeMax(key, value) {
            const n = value === "" ? null : parseFloat(value);
            const current = this.activeFilters[key];
            const min = Array.isArray(current) ? current[0] : null;
            if (min === null && (n === null || isNaN(n))) {
                delete this.activeFilters[key];
            } else {
                this.activeFilters[key] = [min, isNaN(n) ? null : n];
            }
            this.debouncedPushUrl();
        },

        removeFilter(chip) {
            if (chip.type === "range") {
                delete this.activeFilters[chip.key];
            } else if (chip.type === "flag") {
                delete this.activeFilters[chip.key];
            } else {
                const arr = this.activeFilters[chip.key];
                if (Array.isArray(arr)) {
                    const idx = arr.indexOf(chip.value);
                    if (idx >= 0) arr.splice(idx, 1);
                    if (arr.length === 0) delete this.activeFilters[chip.key];
                }
            }
            this.pushUrlState();
        },

        clearAllFilters() {
            for (const key of Object.keys(this.activeFilters)) {
                delete this.activeFilters[key];
            }
            this.includeAltAmmo = false;
            this.pushUrlState();
        },

        displayEntry(col, val) {
            const map = this.displayLabels && this.displayLabels[col];
            return map && map[val];
        },

        displayLabel(col, val) {
            const entry = this.displayEntry(col, val);
            if (!entry) return val || '--';
            const lbl = (typeof entry === 'string' ? entry : entry.label) || val || '--';
            return this.t(lbl);
        },

        displayColor(col, val) {
            const entry = this.displayEntry(col, val);
            return entry && typeof entry === 'object' ? entry.color : null;
        },

        displayStyle(col, val) {
            const c = this.displayColor(col, val);
            if (!c) return null;
            // Convert hex to rgba for background
            const r = parseInt(c.slice(1, 3), 16);
            const g = parseInt(c.slice(3, 5), 16);
            const b = parseInt(c.slice(5, 7), 16);
            return { color: c, background: `rgba(${r}, ${g}, ${b}, 0.15)` };
        },

        filterChipStyle(col, val) {
            const c = this.displayColor(col, val);
            if (!c) return null;
            const r = parseInt(c.slice(1, 3), 16);
            const g = parseInt(c.slice(3, 5), 16);
            const b = parseInt(c.slice(5, 7), 16);
            return { color: c, background: `rgba(${r}, ${g}, ${b}, 0.15)`, borderColor: `rgba(${r}, ${g}, ${b}, 0.3)` };
        },

        filterValueLabel(def, value) {
            if (def.displayMap && def.displayMap[value]) return def.displayMap[value];
            const entry = this.displayEntry(def.key, value);
            if (entry) { const lbl = typeof entry === 'string' ? entry : entry.label || value; return this.t(lbl); }
            if (def.key === "ui_ammo_types") return this.caliberName(value);
            return this.t(value);
        },

        toggleHideNoDrop() {
            this.hideNoDrop = !this.hideNoDrop;
            localStorage.setItem("hideNoDrop", JSON.stringify(this.hideNoDrop));
        },

        toggleHideUnusedAmmo() {
            this.hideUnusedAmmo = !this.hideUnusedAmmo;
            localStorage.setItem("hideUnusedAmmo", JSON.stringify(this.hideUnusedAmmo));
        },

        isUnusedAmmo(item, category) {
            if ((category || this.activeCategory) !== 'Ammo') return false;
            if (!this.ammoWeaponsCache) return false;
            const weapons = this.ammoWeaponsCache[item.id];
            return !weapons || weapons.length === 0;
        },

        setViewMode(mode) {
            this.viewMode = mode;
            localStorage.setItem("viewMode", mode);
            this.pushUrlState();
        },

        factionIcon(name) {
            return FACTION_ICONS[name] || FACTION_ICONS[name?.toLowerCase()] || FACTION_ICONS["stalker"];
        },

        factionColor(name) {
            return FACTION_COLORS[name] || FACTION_COLORS[name?.toLowerCase()] || null;
        },

        exchangeItemId(name) {
            const entry = this.index.find(i => i.name === name || i.displayName === name || i.pda_encyclopedia_name === name);
            return entry ? entry.id : null;
        },

        navigateToItem(id) {
            window.location.hash = id;
        },

        openAmmoFromCaliber(caliberId) {
            const cal = (caliberId || "").trim();
            if (!cal) return;
            const entry = this.calibers[cal];
            const firstVariant = entry?.variants?.[0];
            if (!firstVariant?.id) return;
            this.navigateToItem(firstVariant.id);
        },

        headerLabel(h) {
            if (!h) return "";
            if (h === "_heal") return this.t("app_heal_heals");
            if (h === "_malfunction_chance") return this.t("_malfunction_chance");
            if (h === "_cost_per_round") return this.t("_cost_per_round");
            if (h === "st_upgr_cost" && this.activeCategory === CAT.AMMO) return this.t("_cost_per_pack");
            if (h === "ui_inv_damage" && this.activeCategory === CAT.AMMO) return this.t("st_data_export_damage_mult");
            const translated = this.t(h);
            if (translated !== h) return translated;
            return h;
        },

        isLeftAlignCol(key) {
            const LEFT_COLS = ['pda_encyclopedia_name', 'name', 'ui_st_community', 'ui_ammo_types', 'st_data_export_ammo_types_alt'];
            return LEFT_COLS.includes(key);
        },

        healDots(val) {
            const n = parseInt(val) || 0;
            const filled = Math.min(Math.ceil(n / 3), 4);
            return { filled, empty: 4 - filled };
        },

        statClassFor(category, field, val) {
            if (field === "ui_inv_radiation") {
                const n = parseFloat(val);
                return n > 0 ? "stat-warning" : "";
            }
            if (field === "st_data_export_restore_radiation" || field === "st_data_export_restore_radiation_max") {
                const n = parseFloat(val);
                return n > 0 ? "stat-radiation-restore" : "";
            }
            if (field.includes("/")) return "";
            if (!BIPOLAR.has(field) && !POSITIVE_IS_GOOD.has(field)) return "";
            const s = String(val ?? "");
            const n = parseFloat(s.replace(/%$/, ""));
            if (isNaN(n)) return "";
            if (n > 0) return "stat-positive";
            if (n < 0) return "stat-negative";
            return "";
        },

        statClass(field, val) {
            return this.statClassFor(this.activeCategory, field, val);
        },

        modalStatClass(field, val) {
            return this.statClassFor(this.modalCategory, field, val);
        },

        getColumnRanges(category) {
            if (category === this.activeCategory) return this.columnRanges;
            if (this._rangeCache && this._rangeCache.category === category) return this._rangeCache.ranges;
            const slug = categorySlug(category);
            const items = this.categoryItems[slug] || [];
            const headers = this.categoryHeaders[slug] || [];
            const allHeaders = [...headers];
            if (headers.includes("ui_inv_reli") && !allHeaders.includes("_malfunction_chance")) {
                allHeaders.push("_malfunction_chance");
            }
            if (headers.includes("st_upgr_cost") && category === CAT.AMMO && !allHeaders.includes("_cost_per_round")) {
                allHeaders.push("_cost_per_round");
            }
            const ranges = {};
            for (const h of allHeaders) {
                if (RANGE_EXCLUDE.has(h) || NO_HIGHLIGHT.has(h)) continue;
                if (h.includes("/")) continue;
                let min = Infinity, max = -Infinity;
                for (const item of items) {
                    const v = this.cellValue(item, h);
                    const s = String(v ?? "");
                    const n = parseFloat(s.replace(/%$/, ""));
                    if (isNaN(n)) continue;
                    if (n > max) max = n;
                    if (n < min) min = n;
                }
                if (max !== -Infinity) ranges[h] = { max, min };
            }
            this._rangeCache = { category, ranges };
            return ranges;
        },

        statStyleFor(category, field, val) {
            if (NO_HIGHLIGHT.has(field) || BADGE_COLS.has(field)) return null;
            if (field.includes("/")) return null;
            const s = String(val ?? "");
            const n = parseFloat(s.replace(/%$/, ""));
            if (isNaN(n)) return null;
            if (n === 0) return { color: "rgba(136,136,136,0.35)" };
            if (field === "ui_inv_radiation" || field === "st_data_export_restore_radiation" || field === "st_data_export_restore_radiation_max") return null;
            const ranges = this.getColumnRanges(category);
            const range = ranges[field];
            if (!range) return null;
            const gr = 0x88, gg = 0x88, gb = 0x88;
            let tr, tg, tb, t;
            if (BIPOLAR.has(field)) {
                // Red at negative extreme, gray at zero, green at positive extreme
                const extreme = n > 0 ? range.max : range.min;
                if (extreme === 0) return null;
                t = Math.min(Math.abs(n) / Math.abs(extreme), 1);
                if (n > 0) { tr = 0x4a; tg = 0xc4; tb = 0x5a; }
                else       { tr = 0xf0; tg = 0x6a; tb = 0x5e; }
            } else if (POSITIVE_IS_GOOD.has(field)) {
                // Gray at low end, green at high end
                const span = range.max - range.min;
                if (span === 0) return null;
                t = Math.min((n - range.min) / span, 1);
                tr = 0x4a; tg = 0xc4; tb = 0x5a;
            } else if (HIGHER_IS_WORSE.has(field)) {
                // Cyan at low end, red at high end (direct interpolation)
                const span = range.max - range.min;
                if (span === 0) return null;
                const pos = Math.min((n - range.min) / span, 1);
                const cr = 0x6e, cg = 0xb8, cb = 0xd0;
                const rr = 0xd4, rg = 0x91, rb = 0x5e;
                const r = Math.round(cr + (rr - cr) * pos);
                const g = Math.round(cg + (rg - cg) * pos);
                const b = Math.round(cb + (rb - cb) * pos);
                return { color: `rgb(${r},${g},${b})` };
            } else if (LOWER_IS_BETTER.has(field)) {
                // Gray at low end, cyan at high end
                const span = range.max - range.min;
                if (span === 0) return null;
                t = Math.min((n - range.min) / span, 1);
                tr = 0x6e; tg = 0xb8; tb = 0xd0;
            } else {
                // Neutral magnitude: gray → cyan
                const span = range.max - range.min;
                if (span === 0) return null;
                t = Math.min((n - range.min) / span, 1);
                tr = 0x6e; tg = 0xb8; tb = 0xd0;
            }
            const r = Math.round(gr + (tr - gr) * t);
            const g = Math.round(gg + (tg - gg) * t);
            const b = Math.round(gb + (tb - gb) * t);
            return { color: `rgb(${r},${g},${b})` };
        },

        statStyle(field, val) {
            return this.statStyleFor(this.activeCategory, field, val);
        },

        modalStatStyle(field, val) {
            return this.statStyleFor(this.modalCategory, field, val);
        },

        ammoColDecimals(key) {
            if (!this._ammoDecCache) this._ammoDecCache = {};
            const wpn = this.modalItem;
            if (!wpn) return { raw: 0, eff: 0 };
            const cacheKey = `${wpn.id}::${key}`;
            if (this._ammoDecCache[cacheKey] !== undefined) return this._ammoDecCache[cacheKey];
            let maxRaw = 0, maxEff = 0;
            const base = parseFloat(wpn[key]);
            for (const v of this.modalAmmoVariants) {
                const raw = v[key];
                if (!raw) continue;
                const str = String(raw).replace("%", "");
                const dot = str.indexOf(".");
                if (dot >= 0) maxRaw = Math.max(maxRaw, str.length - dot - 1);
                if (!isNaN(base)) {
                    const pct = parseFloat(str);
                    const eff = key === "Damage"
                        ? Math.round(base * parseFloat(raw) * 10) / 10
                        : Math.round(base * pct / 100);
                    const es = String(eff);
                    const ed = es.indexOf(".");
                    if (ed >= 0) maxEff = Math.max(maxEff, es.length - ed - 1);
                }
            }
            const result = { raw: maxRaw, eff: maxEff };
            this._ammoDecCache[cacheKey] = result;
            return result;
        },

        formatAmmoStat(key, val, variant) {
            if (key === "AP") {
                if (!variant || !variant.apClass) return "--";
                return `${variant.apValue}`;
            }
            if (!val) return "--";
            const wpn = this.modalItem;
            if (wpn) {
                const pct = parseFloat(String(val).replace("%", ""));
                if (key === "ui_inv_damage" && wpn["ui_inv_damage"]) {
                    const dec = this.ammoColDecimals("ui_inv_damage");
                    const mult = parseFloat(val);
                    const eff = Math.round(parseFloat(wpn["ui_inv_damage"]) * mult * 10) / 10;
                    return `${mult.toFixed(dec.raw)} (${eff.toFixed(dec.eff)})`;
                }
                if (key === "ui_inv_wrange" && wpn["ui_inv_wrange"] && String(val).includes("%")) {
                    const dec = this.ammoColDecimals("ui_inv_wrange");
                    const eff = Math.round(parseFloat(wpn["ui_inv_wrange"]) * pct / 100);
                    return `${pct.toFixed(dec.raw)}% (${eff} ${this.tUnit("ui_inv_wrange")})`;
                }
                if (key === "ui_inv_bspeed" && wpn["ui_inv_bspeed"] && String(val).includes("%")) {
                    const dec = this.ammoColDecimals("ui_inv_bspeed");
                    const eff = Math.round(parseFloat(wpn["ui_inv_bspeed"]) * pct / 100);
                    return `${pct.toFixed(dec.raw)}% (${eff} ${this.tUnit("ui_inv_bspeed")})`;
                }
            }
            const unit = this.tUnit(key);
            if (unit) return `${val} ${unit}`;
            return val;
        },

        ammoArrow(key, val) {
            if (!val || !this.modalItem) return null;
            if (key === "ui_inv_damage") {
                const mult = parseFloat(val);
                if (isNaN(mult)) return null;
                if (mult === 1) return 0;
                return mult > 1 ? 1 : -1;
            }
            if (key === "ui_inv_wrange" || key === "ui_inv_bspeed") {
                const pct = parseFloat(String(val).replace("%", ""));
                if (isNaN(pct)) return null;
                if (pct === 100) return 0;
                return pct > 100 ? 1 : -1;
            }
            return null;
        },

        isAmmoBest(key, val, variant) {
            if (key === "AP") {
                const best = this.modalAmmoBest["AP"];
                if (!best || !variant || !variant.apClass) return false;
                return variant.apClass === best.apClass && variant.apValue === best.apValue;
            }
            const best = this.modalAmmoBest[key];
            if (best === undefined || !val) return false;
            return parseFloat(String(val).replace("%", "")) === best;
        },

        columnMaxDecimals(slug, col) {
            if (!this._colDecCache) this._colDecCache = {};
            const key = `${slug}::${col}`;
            if (this._colDecCache[key] !== undefined) return this._colDecCache[key];
            const items = this.categoryItems[slug] || [];
            let max = 0;
            for (const item of items) {
                const raw = String(item[col] || "").replace("%", "");
                const dot = raw.indexOf(".");
                if (dot >= 0) {
                    max = Math.max(max, raw.length - dot - 1);
                }
            }
            this._colDecCache[key] = max;
            return max;
        },

        cellValue(item, field) {
            if (field === "_malfunction_chance") {
                const reliVal = parseFloat(String(item["ui_inv_reli"] || "").replace("%", ""));
                return isNaN(reliVal) ? undefined : malfunctionChance(reliVal);
            }
            if (field === "_cost_per_round") {
                const cost = parseFloat(item["st_upgr_cost"]);
                const box = parseFloat(item["st_data_export_ammo_box_size"]);
                if (isNaN(cost) || isNaN(box) || box === 0) return undefined;
                return cost / box;
            }
            return item[field];
        },

        formatValue(h, val, tableMode) {
            if (val === undefined || val === null || val === "" || val === "--") return "--";
            if (h === "_malfunction_chance") return val.toFixed(2) + "%";
            if (h === "_cost_per_round") return parseFloat(val).toFixed(1) + " ₽";
            if (h === "ui_ammo_types" || h === "st_data_export_ammo_types_alt") return this.caliberName(val);
            if (h === "ui_st_community") return this.t(val);

            const s = String(val);
            const isPct = s.includes("%");
            const raw = isPct ? s.replace("%", "") : s;
            const n = parseFloat(raw);

            if (h === "st_prop_weight" || h === "ui_inv_outfit_additional_weight") {
                const wn = parseFloat(val);
                if (isNaN(wn)) return val;
                const kg = this.tUnit("st_prop_weight");
                if (tableMode) {
                    const slug = this.activeCategory ? categorySlug(this.activeCategory) : "";
                    const hasDec = slug ? this.columnMaxDecimals(slug, h) > 0 : false;
                    return `${hasDec ? wn.toFixed(2) : wn} ${kg}`;
                }
                return `${parseFloat(wn.toFixed(2))} ${kg}`;
            }

            if (tableMode) {
                const slug = this.activeCategory ? categorySlug(this.activeCategory) : "";
                const hasDec = slug ? this.columnMaxDecimals(slug, h) > 0 : false;

                if (!isNaN(n) && hasDec) {
                    const formatted = n.toFixed(2);
                    const display = isPct ? `${formatted}%` : formatted;
                    const unit = this.tUnit(h);
                    if (unit && !isPct) return `${display} ${unit}`;
                    return display;
                }

                const unit = this.tUnit(h);
                if (unit && !isPct) return `${isNaN(n) ? val : val} ${unit}`;
                return val;
            }
            const unit = this.tUnit(h);
            if (!isNaN(n) && n !== Math.floor(n)) {
                const display = parseFloat(n.toFixed(1));
                if (unit && !isPct) return `${display} ${unit}`;
                return isPct ? `${display}%` : String(display);
            }
            if (unit && !isPct && n !== 0) return `${val} ${unit}`;
            return val;
        },

        singularType(val) {
            return SINGULAR_TYPE[val] || val;
        },

        singularCategory(val) {
            return SINGULAR_CATEGORY[val] || val;
        },

        getItemCategoryLabel(item) {
            if (!item) return "";
            const allSlugs = [...PRIMARY_WEAPON_SLUGS, ...SIDEARM_SLUGS, GRENADE_SLUG, "outfits", "helmets", "belt-attachments", "artefacts", "ammo"];
            for (const slug of allSlugs) {
                const items = this.categoryItems[slug] || [];
                if (items.some(i => i.id === item.id)) {
                    // Reverse slug to CAT name, then to singular label
                    for (const [cat, key] of Object.entries(CATEGORY_KEYS)) {
                        if (categorySlug(cat) === slug) {
                            return this.t(SINGULAR_CATEGORY[cat] || cat);
                        }
                    }
                }
            }
            return "";
        },

        tItemName(item) {
            const name = this.tName(item);
            return this.getItemSlotType(item) === "ammo" ? this.shortAmmoName(name) : name;
        },

        shortAmmoName(name) {
            return name.replace(/\s*rounds$/i, "").replace(/^Патроны\s*/i, "").replace(/\s*мм\b/i, "").replace(/\s*mm\b/i, "").replace(/\bPst\b/, "PST");
        },

        escapeHtml(text) {
            return String(text ?? "").replace(/[&<>"']/g, (ch) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[ch]));
        },

        ammoItemById(id) {
            if (!id) return null;
            const ammoItems = this.categoryItems["ammo"] || [];
            return ammoItems.find(i => i.id === id) || null;
        },

        ammoDescriptionText(variant) {
            if (!variant) return "";
            const ammoItem = this.ammoItemById(variant.id);
            if (ammoItem) {
                const parsed = this.parseDescription(ammoItem);
                if (parsed?.text) return parsed.text;
            }
            const key = variant.name ? `${variant.name}_descr` : "";
            if (!key) return "";
            const raw = this.t(key);
            if (!raw || raw === key) return "";
            return raw.split(/\\n\\s*\\n/)[0].replace(/\\n/g, " ").trim();
        },

        ammoImageUrl(variant) {
            if (variant?.id) return `img/icons/${variant.id}.png`;
            return "img/icons/unknown.png";
        },

        ammoDescEnRaw(variant, ammoItem) {
            // Returns raw EN description string (with literal \n sequences) for the given ammo.
            const descKey = (
                ammoItem?.st_data_export_description
                ?? (variant?.name ? `${variant.name}_descr` : "")
            ).toLowerCase();
            if (!descKey) return "";
            return this.translations?.en?.[descKey] ?? "";
        },

        ammoNominalDmg(variant, ammoItem) {
            // Parse "Nominal stopping power (DMG): <value>" from the EN description.
            // Always use EN so the number matches the authoritative game text.
            const raw = this.ammoDescEnRaw(variant, ammoItem);
            if (!raw) return null;
            // Handle occasional double-colon typos in source CSVs
            const m = raw.match(/\(DMG\)\s*:+\s*([^\n\\]+)/i);
            if (!m) return null;
            return m[1].trim() || null;
        },

        ammoNominalAp(variant, ammoItem) {
            // Parse "Armor penetration power (AP): <text>" from the EN description.
            // apClass in calibers.json can be wrong; description is the authoritative source.
            const raw = this.ammoDescEnRaw(variant, ammoItem);
            if (!raw) return null;
            const m = raw.match(/\(AP\)\s*:+\s*([^\n\\]+)/i);
            if (!m) return null;
            return m[1].trim() || null;
        },

        ammoDamageDisplay(variant, ammoItem) {
            const fromDesc = this.ammoNominalDmg(variant, ammoItem);
            if (fromDesc) return fromDesc;
            // Fallback: ammo multiplier × 100 (less accurate but better than nothing)
            const raw = variant?.ui_inv_damage ?? ammoItem?.ui_inv_damage;
            const n = parseFloat(raw);
            if (isNaN(n)) return "--";
            if (n <= 3) return String(Math.round(n * 100));
            return String(Math.round(n));
        },

        ammoBrDisplay(variant, ammoItem) {
            const fromDesc = this.ammoNominalAp(variant, ammoItem);
            if (fromDesc) return fromDesc;
            // Fallback to structured data (may have wrong apClass for some rounds)
            const apClass = variant?.apClass;
            const apValue = variant?.apValue ?? ammoItem?.st_data_export_ap;
            if (apClass != null && apValue != null) return `BR${apClass} (${apValue})`;
            if (apValue != null) return `AP (${apValue})`;
            return "--";
        },

        ammoCostPerRound(variant, ammoItem) {
            const totalCost = parseFloat(variant?.st_upgr_cost ?? ammoItem?.st_upgr_cost ?? "");
            const boxSize = parseFloat(ammoItem?.st_data_export_ammo_box_size ?? "");
            if (isNaN(totalCost)) return null;
            if (!isNaN(boxSize) && boxSize > 0) return String(Math.round(totalCost / boxSize));
            return String(Math.round(totalCost));
        },

        ammoTooltipPayload(caliberId) {
            const cal = (caliberId || "").trim();
            if (!cal) return "";
            const entry = this.calibers[cal];
            if (!entry || !entry.variants?.length) return this.caliberName(cal);
            const variant = entry.variants[0];
            const ammoItem = this.ammoItemById(variant.id);
            const title = this.escapeHtml(this.shortAmmoName(this.t(entry.name || cal)));
            const desc = this.escapeHtml(this.ammoDescriptionText(variant));
            const br = this.escapeHtml(this.ammoBrDisplay(variant, ammoItem));
            const dmg = this.escapeHtml(this.ammoDamageDisplay(variant, ammoItem));
            const img = this.escapeHtml(this.ammoImageUrl(variant));
            const acc = variant?.ui_inv_accuracy ?? ammoItem?.ui_inv_accuracy ?? null;
            const cpr = this.ammoCostPerRound(variant, ammoItem);

            const chips = [
                `<span class='ammo-tooltip-chip ammo-tooltip-chip-br'>${br}</span>`,
                `<span class='ammo-tooltip-chip ammo-tooltip-chip-dmg'>DMG ${dmg}</span>`,
            ];
            if (acc != null) chips.push(`<span class='ammo-tooltip-chip ammo-tooltip-chip-acc'>Accuracy ${this.escapeHtml(String(acc))}</span>`);
            if (cpr != null) chips.push(`<span class='ammo-tooltip-chip ammo-tooltip-chip-cost'>Cost/Round ${this.escapeHtml(cpr)} ₽</span>`);

            return {
                className: "tooltip-ammo-card",
                html: [
                    "<div class='ammo-tooltip'>",
                    `  <div class='ammo-tooltip-image-wrap'><img class='ammo-tooltip-image' src='${img}' alt='${title}' onerror="this.parentNode.style.display='none'"></div>`,
                    "  <div class='ammo-tooltip-body'>",
                    `    <div class='ammo-tooltip-title'>${title}</div>`,
                    `    <div class='ammo-tooltip-desc'>${desc || "--"}</div>`,
                    `    <div class='ammo-tooltip-highlights'>${chips.join("")}</div>`,
                    "  </div>",
                    "</div>",
                ].join(""),
            };
        },

        caliberName(val) {
            if (!val) return "--";
            return val.split(";").map(s => {
                const cal = s.trim();
                const entry = this.calibers[cal];
                return this.shortAmmoName(entry ? this.t(entry.name) : this.t(cal));
            }).join(", ");
        },

        caliberVariants(val) {
            if (!val) return [];
            const variants = [];
            for (const s of val.split(";")) {
                const cal = s.trim();
                const entry = this.calibers[cal];
                if (entry) variants.push(...entry.variants.map(v => v.name));
                else variants.push(cal);
            }
            return variants;
        },

        caliberVariantObjects(val) {
            if (!val) return [];
            const variants = [];
            for (const s of val.split(";")) {
                const cal = s.trim();
                const entry = this.calibers[cal];
                if (entry) variants.push(...entry.variants);
                else variants.push({ id: null, name: cal });
            }
            return variants;
        },

        pushUrlState(push) {
            const url = new URL(window.location);
            // Clear legacy query params now handled by path
            url.searchParams.delete("pack");
            url.searchParams.delete("cat");
            // Clear legacy build params
            for (const k of ["outfit","helmet","backpack","belt","arts","pn","pf","bsb","w1","w2","a1","a2","wp","ws","wsi","wg","ap","as","asi"]) url.searchParams.delete(k);

            // Build pathname
            const pathState = {
                pack: this.activePack?.id,
                cat: this.activeCategory,
                buildPlanner: this.buildPlannerActive,
                favorites: this.favoritesViewActive,
                recent: this.recentViewActive,
                versionCompare: this.versionCompareActive,
            };
            url.pathname = buildPathUrl(pathState);

            if (!this.buildPlannerActive) {
                // Clear share hash when leaving build planner
                if (url.hash.startsWith("#" + BUILD_HASH_PREFIX) || url.hash.startsWith("#b/")) url.hash = "";
            }

            if (this.activeCategory && this.showFavoritesOnly) {
                url.searchParams.set("favonly", "1");
            } else {
                url.searchParams.delete("favonly");
            }
            if (this.sortCol && this.sortCol !== "pda_encyclopedia_name") {
                url.searchParams.set("sort", this.sortCol);
            } else {
                url.searchParams.delete("sort");
            }
            if (!this.sortAsc) {
                url.searchParams.set("dir", "desc");
            } else {
                url.searchParams.delete("dir");
            }
            if (this.viewMode !== "tiles") {
                url.searchParams.set("view", this.viewMode);
            } else {
                url.searchParams.delete("view");
            }
            if (this.filterQuery.trim()) {
                url.searchParams.set("q", this.filterQuery.trim());
            } else {
                url.searchParams.delete("q");
            }
            url.searchParams.delete("f");
            for (const [key, val] of Object.entries(this.activeFilters)) {
                if (val === true) {
                    url.searchParams.append("f", key);
                } else if (val === false) {
                    url.searchParams.append("f", "!" + key);
                } else if (Array.isArray(val) && val.length === 2 && (typeof val[0] === "number" || val[0] === null)) {
                    if (val[0] !== null || val[1] !== null) {
                        url.searchParams.append("f", key + ":" + (val[0] ?? "") + "~" + (val[1] ?? ""));
                    }
                } else if (Array.isArray(val) && val.length > 0) {
                    url.searchParams.append("f", key + ":" + val.join(","));
                }
            }
            if (this.includeAltAmmo) {
                url.searchParams.set("altammo", "1");
            } else {
                url.searchParams.delete("altammo");
            }
            if (this.exchangeFactionFilter) {
                url.searchParams.set("faction", this.exchangeFactionFilter);
            } else {
                url.searchParams.delete("faction");
            }
            if (this.locale) {
                url.searchParams.set("lang", this.locale);
            }
            if (push) {
                history.pushState(null, "", url);
            } else {
                history.replaceState(null, "", url);
            }

            // Persist filter state for the active category
            if (this.activeCategory && this.activePack) {
                saveCategoryFilters(this.activePack.id, categorySlug(this.activeCategory), {
                    activeFilters: JSON.parse(JSON.stringify(this.activeFilters)),
                    filterQuery: this.filterQuery,
                    sortCol: this.sortCol,
                    sortAsc: this.sortAsc,
                    exchangeFactionFilter: this.exchangeFactionFilter,
                    includeAltAmmo: this.includeAltAmmo,
                });
            }
        },

        restoreUrlState(search, pathname) {
            const params = new URLSearchParams(search || window.location.search);
            const parsed = parsePathUrl(pathname || window.location.pathname);
            // Also support legacy ?cat= query param for backward compat
            const legacyCat = params.get("cat");
            if (parsed.buildPlanner || legacyCat === "build-planner") {
                // Will be handled after data loads
                this._pendingBuildRestore = params;
            } else if (parsed.versionCompare || legacyCat === "version-compare") {
                this.versionCompareActive = true;
                this.activeCategory = null;
                if (this.crossPackId) this.loadVersionCompareData();
            } else if (parsed.favorites || legacyCat === "favorites") {
                this.favoritesViewActive = true;
                this.activeCategory = null;
            } else if (parsed.recent || legacyCat === "recent") {
                this.recentViewActive = true;
                this.activeCategory = null;
            }
            if (params.get("favonly") === "1") {
                this.showFavoritesOnly = true;
            }
            const sort = params.get("sort");
            if (sort) this.sortCol = sort;
            const dir = params.get("dir");
            if (dir === "desc") this.sortAsc = false;
            const view = params.get("view");
            if (view === "table" || view === "tiles") this.viewMode = view;
            const q = params.get("q");
            if (q) { this.filterQuery = q; this.filterInput = q; }
            const fs = params.getAll("f");
            for (const f of fs) {
                const colonIdx = f.indexOf(":");
                if (colonIdx === -1) {
                    if (f.startsWith("!")) {
                        this.activeFilters[f.slice(1)] = false;
                    } else {
                        this.activeFilters[f] = true;
                    }
                } else {
                    const key = f.slice(0, colonIdx);
                    const valPart = f.slice(colonIdx + 1);
                    if (valPart.includes("~")) {
                        const parts = valPart.split("~");
                        const lo = parts[0] === "" ? null : parseFloat(parts[0]);
                        const hi = parts[1] === "" ? null : parseFloat(parts[1]);
                        this.activeFilters[key] = [isNaN(lo) ? null : lo, isNaN(hi) ? null : hi];
                    } else {
                        this.activeFilters[key] = valPart.split(",");
                    }
                }
            }
            if (params.get("altammo") === "1") this.includeAltAmmo = true;
            const faction = params.get("faction");
            if (faction) this.exchangeFactionFilter = faction;
        },

        async copyLink() {
            await this.copyToClipboard(window.location.href, "copyLinkFeedback");
        },

        toggleSort(col) {
            if (this.sortCol === col) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortCol = col;
                this.sortAsc = true;
            }
            this.pushUrlState();
        },

        toggleToolkitSort(col) {
            if (this.toolkitSortCol === col) {
                this.toolkitSortAsc = !this.toolkitSortAsc;
            } else {
                this.toolkitSortCol = col;
                this.toolkitSortAsc = col === '_name';
            }
        },

        toolkitSortIcon(col) {
            if (this.toolkitSortCol !== col) return "";
            return this.toolkitSortAsc ? " \u25B2" : " \u25BC";
        },

        toolkitHeatBg(value) {
            if (!value) return "";
            const intensity = Math.min(value / 100, 1) * 0.45;
            return `background: rgba(76, 175, 80, ${intensity})`;
        },

        sortIcon(col) {
            if (this.sortCol !== col) return "";
            return this.sortAsc ? " \u25B2" : " \u25BC";
        },

        handleEscape() {
            if (this.calloutActive) {
                this.dismissCallout();
            } else if (this.whatsNewVisible) {
                this.dismissWhatsNew();
            } else if (this.shortcutHelpOpen) {
                this.shortcutHelpOpen = false;
            } else if (this.buildImportCodeModalOpen) {
                this.buildImportCodeModalOpen = false;
            } else if (this.buildSaveModalOpen) {
                this.buildSaveModalOpen = false;
            } else if (this.buildPickerOpen) {
                this.closeBuildPicker();
            } else if (this.$refs.filterBar && this.$refs.filterBar.hasOpenPanel()) {
                this.$refs.filterBar.closeAllPanels();
            } else if (this.sidebarOpen) {
                this.sidebarOpen = false;
            } else if (this.compareOpen) {
                this.closeCompare();
            } else if (this.modalOpen) {
                this.closeModal();
            }
        },

        toggleGroup(name) {
            this.collapsedGroups = { ...this.collapsedGroups, [name]: !this.collapsedGroups[name] };
            try { localStorage.setItem("collapsedGroups", JSON.stringify(this.collapsedGroups)); } catch (e) {}
        },
        toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
        closeSidebar() { this.sidebarOpen = false; },
        toggleSidebarCollapse() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            try { localStorage.setItem("sidebarCollapsed", this.sidebarCollapsed ? "1" : ""); } catch (e) { /* quota or private mode */ }
        },

        navigateCategory(direction) {
            const allCats = this.groupedCategories.flatMap(g => g.categories);
            if (!allCats.length) return;
            const idx = this.activeCategory ? allCats.indexOf(this.activeCategory) : -1;
            const newIdx = idx < 0 ? 0 : (idx + direction + allCats.length) % allCats.length;
            this.selectCategory(allCats[newIdx]);
        },

        clearGlobalQuery() {
            if (this.globalQuery.trim()) this.lastGlobalQuery = this.globalQuery;
            this.globalQuery = "";
        },

        // Build Planner methods
        async openBuildPlanner() {
            this.resetViewState();
            this.buildPlannerActive = true;

            // Load equipment category data
            const cats = ["outfits", "helmets", "belt-attachments", "artefacts", ...WEAPON_CATEGORY_SLUGS, GRENADE_SLUG, "ammo"];
            await Promise.all(cats.map(async (slug) => {
                if (this.categoryItems[slug]) return;
                try {
                    const res = await fetch(this.dataUrl(`${slug}.json`));
                    const data = await res.json();
                    for (const item of data.items) {
                        item.localeName = this.tName(item);
                    }
                    this.categoryItems[slug] = data.items;
                    this.categoryHeaders[slug] = data.headers;
                    this.categoryFuse[slug] = new Fuse(data.items, {
                        keys: ["displayName", "pda_encyclopedia_name", "localeName", "id"],
                        threshold: 0.35,
                    });
                } catch (e) {
                    console.error(`Failed to load ${slug}:`, e);
                    this.categoryItems[slug] = [];
                    this.categoryHeaders[slug] = [];
                }
            }));

            this.loadBuildFromStorage();
            this.loadInventoryFromStorage();
            this.loadSavedBuilds();
            this.buildInventorySort = localStorage.getItem("buildInventorySort") || "none";
            this.buildWeaponCompareSlot = localStorage.getItem("buildWeaponCompareSlot") || "primary";
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
            this.$nextTick(() => this.checkCallouts());
        },

        isAltAmmo(weapon, ammoItem) {
            if (!weapon || !ammoItem) return false;
            const alt = weapon["st_data_export_ammo_types_alt"];
            if (!alt) return false;
            const altTypes = new Set();
            for (const a of alt.split(";")) {
                const t = a.trim();
                if (t) { altTypes.add(t); altTypes.add(t.replace(/-/g, "_")); altTypes.add(t.replace(/_/g, "-")); }
            }
            return altTypes.has(ammoItem.pda_encyclopedia_name);
        },

        getCompatibleAmmo(weapon) {
            if (!weapon) return [];
            const ammoTypes = new Set();
            for (const f of ["ui_ammo_types", "st_data_export_ammo_types_alt"]) {
                if (weapon[f]) {
                    for (const a of weapon[f].split(";")) {
                        const trimmed = a.trim();
                        if (trimmed) {
                            // Store both hyphen and underscore variants for flexible matching
                            ammoTypes.add(trimmed);
                            ammoTypes.add(trimmed.replace(/-/g, "_"));
                            ammoTypes.add(trimmed.replace(/_/g, "-"));
                        }
                    }
                }
            }
            const allAmmo = this.categoryItems["ammo"] || [];
            return allAmmo.filter(a => ammoTypes.has(a.pda_encyclopedia_name));
        },

        isWeaponMelee(weapon) {
            if (!weapon) return false;
            const meleeItems = this.categoryItems["melee"] || [];
            return meleeItems.some(i => i.id === weapon.id);
        },

        openBuildPicker(slotType, index) {
            this.buildPickerSlot = { type: slotType, index };
            this.buildPickerQuery = "";
            let items;
            if (slotType === "belt") {
                const beltItems = (this.categoryItems["belt-attachments"] || []).filter(i => !isBackpack(i));
                const artItems = this.categoryItems["artefacts"] || [];
                items = beltItems.concat(artItems);
            } else if (slotType === "weapon") {
                items = [];
                for (const slug of PRIMARY_WEAPON_SLUGS) {
                    items = items.concat(this.categoryItems[slug] || []);
                }
            } else if (slotType === "sidearm") {
                items = [];
                for (const slug of SIDEARM_SLUGS) {
                    items = items.concat(this.categoryItems[slug] || []);
                }
            } else if (slotType === "grenade") {
                items = this.categoryItems[GRENADE_SLUG] || [];
            } else if (slotType === "ammo") {
                const weaponMap = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm };
                const weapon = weaponMap[index] || null;
                items = weapon ? this.getCompatibleAmmo(weapon) : [];
            } else {
                const cat = BUILD_SLOT_CATEGORIES[slotType];
                const slug = categorySlug(cat);
                items = this.categoryItems[slug] || [];
            }
            this.buildPickerFuse = new Fuse(items, {
                keys: ["displayName", "pda_encyclopedia_name", "localeName", "id"],
                threshold: 0.35,
            });
            this.buildPickerOpen = true;
            document.body.style.overflow = "hidden";
        },

        closeBuildPicker() {
            this.hideBuildHover();
            this.buildPickerOpen = false;
            this.buildPickerSlot = null;
            this.buildPickerQuery = "";
            document.body.style.overflow = "";
        },

        selectBuildItem(item) {
            if (!this.buildPickerSlot) return;
            const { type, index } = this.buildPickerSlot;
            if (type === "inventory") {
                const slotType = this.getItemSlotType(item);
                if (slotType && !this.buildInventory.some(e => e.item.id === item.id)) {
                    this.addToInventory(item, slotType);
                    this.saveInventoryToStorage();
                }
                this.closeBuildPicker();
                return;
            }
            if (type === "outfit") {
                this.buildOutfit = item;
                // Overflow belt+artifact items to inventory if new outfit has fewer slots
                const maxSlots = parseInt(item["st_data_export_outfit_artefact_count_max"]) || 0;
                while (this.buildBelts.length + this.buildArtifacts.length > maxSlots) {
                    if (this.buildArtifacts.length > 0) {
                        this.addToInventory(this.buildArtifacts.pop(), "artifact");
                    } else {
                        this.addToInventory(this.buildBelts.pop(), "belt");
                    }
                }
                this.saveInventoryToStorage();
            } else if (type === "helmet") {
                this.buildHelmet = item;
            } else if (type === "backpack") {
                this.buildBackpack = item;
            } else if (type === "belt") {
                // Determine actual slot type from item category
                const actualType = this.getItemSlotType(item);
                if (actualType === "artifact") {
                    this.buildArtifacts.push(item);
                } else if (index !== undefined && index < this.buildBelts.length) {
                    this.buildBelts[index] = item;
                } else {
                    this.buildBelts.push(item);
                }
            } else if (type === "artifact") {
                if (index !== undefined && index < this.buildArtifacts.length) {
                    this.buildArtifacts[index] = item;
                } else {
                    this.buildArtifacts.push(item);
                }
            } else if (type === "weapon") {
                if (index === "primary") {
                    this.buildWeaponPrimary = item;
                    if (this.buildAmmoPrimary && !this.getCompatibleAmmo(item).some(a => a.id === this.buildAmmoPrimary.id)) {
                        this.buildAmmoPrimary = null;
                    }
                } else {
                    this.buildWeaponSecondary = item;
                    if (this.buildAmmoSecondary && !this.getCompatibleAmmo(item).some(a => a.id === this.buildAmmoSecondary.id)) {
                        this.buildAmmoSecondary = null;
                    }
                }
            } else if (type === "sidearm") {
                this.buildWeaponSidearm = item;
                if (this.buildAmmoSidearm && (this.isWeaponMelee(item) || !this.getCompatibleAmmo(item).some(a => a.id === this.buildAmmoSidearm.id))) {
                    this.buildAmmoSidearm = null;
                }
            } else if (type === "grenade") {
                this.buildWeaponGrenade = item;
            } else if (type === "ammo") {
                const ammoMap = { primary: "buildAmmoPrimary", secondary: "buildAmmoSecondary", sidearm: "buildAmmoSidearm" };
                if (ammoMap[index]) this[ammoMap[index]] = item;
            }
            this.closeBuildPicker();
            this.saveBuildToStorage();
            this.pushUrlState();
        },

        removeBuildSlot(type, index) {
            this.hideBuildHover();
            if (type === "outfit") {
                if (this.buildOutfit) this.addToInventory(this.buildOutfit, "outfit");
                for (const b of this.buildBelts) this.addToInventory(b, "belt");
                for (const a of this.buildArtifacts) this.addToInventory(a, "artifact");
                this.buildOutfit = null;
                this.buildBelts = [];
                this.buildArtifacts = [];
            } else if (type === "helmet") {
                if (this.buildHelmet) this.addToInventory(this.buildHelmet, "helmet");
                this.buildHelmet = null;
            } else if (type === "backpack") {
                if (this.buildBackpack) this.addToInventory(this.buildBackpack, "backpack");
                this.buildBackpack = null;
            } else if (type === "belt") {
                if (this.buildBelts[index]) this.addToInventory(this.buildBelts[index], "belt");
                this.buildBelts.splice(index, 1);
            } else if (type === "artifact") {
                if (this.buildArtifacts[index]) this.addToInventory(this.buildArtifacts[index], "artifact");
                this.buildArtifacts.splice(index, 1);
            } else if (type === "weapon") {
                if (index === "primary") {
                    if (this.buildWeaponPrimary) this.addToInventory(this.buildWeaponPrimary, "weapon");
                    this.buildWeaponPrimary = null; this.buildAmmoPrimary = null;
                } else {
                    if (this.buildWeaponSecondary) this.addToInventory(this.buildWeaponSecondary, "weapon");
                    this.buildWeaponSecondary = null; this.buildAmmoSecondary = null;
                }
            } else if (type === "sidearm") {
                if (this.buildWeaponSidearm) this.addToInventory(this.buildWeaponSidearm, "sidearm");
                this.buildWeaponSidearm = null; this.buildAmmoSidearm = null;
            } else if (type === "grenade") {
                if (this.buildWeaponGrenade) this.addToInventory(this.buildWeaponGrenade, "grenade");
                this.buildWeaponGrenade = null;
            } else if (type === "ammo") {
                const ammoMap = { primary: "buildAmmoPrimary", secondary: "buildAmmoSecondary", sidearm: "buildAmmoSidearm" };
                if (ammoMap[index]) this[ammoMap[index]] = null;
            }
            // Reset compare slot if the selected weapon was removed
            const compareMap = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm };
            if (!compareMap[this.buildWeaponCompareSlot]) {
                this.setWeaponCompareSlot("primary");
            }
            this.saveBuildToStorage();
            this.saveInventoryToStorage();
            this.pushUrlState();
        },

        clearBuild() {
            this.buildOutfit = null;
            this.buildHelmet = null;
            this.buildBackpack = null;
            this.buildBelts = [];
            this.buildArtifacts = [];
            this.buildWeaponPrimary = null;
            this.buildWeaponSecondary = null;
            this.buildWeaponSidearm = null;
            this.buildWeaponGrenade = null;
            this.buildAmmoPrimary = null;
            this.buildAmmoSecondary = null;
            this.buildAmmoSidearm = null;
            this.buildActiveWeaponTab = "primary";
            this.setWeaponCompareSlot("primary");
            this.buildExpandedStats = {};
            this.buildInventory = [];
            this.saveBuildToStorage();
            this.saveInventoryToStorage();
            this.pushUrlState();
        },

        toggleBuildExpandAll() {
            const allFields = ["weight", "carry", "armor", "speed", ...PROTECTION_FIELDS, ...RESTORATION_FIELDS];
            const wpnFields = this.buildWeaponStats ? this.buildWeaponStats.stats.map(s => "wpn_" + s.field) : [];
            if (this.buildAllExpanded) {
                this.buildExpandedStats = {};
            } else {
                const expanded = {};
                for (const f of [...allFields, ...wpnFields]) expanded[f] = true;
                this.buildExpandedStats = expanded;
            }
        },

        toggleBuildStatExpand(field) {
            if (this.buildExpandedStats[field]) {
                delete this.buildExpandedStats[field];
            } else {
                this.buildExpandedStats[field] = true;
            }
            // Force reactivity
            this.buildExpandedStats = { ...this.buildExpandedStats };
        },

        buildStatFormatted(field, value) {
            if (PROTECTION_FIELDS.includes(field)) return value.toFixed(1) + "%";
            if (field === "st_prop_weight") return parseFloat(value.toFixed(2)) + " " + this.tUnit("st_prop_weight");
            if (field === "ui_inv_outfit_additional_weight") return "+" + value + " " + this.tUnit("st_prop_weight");
            if (field === "ui_inv_ap_res") return String(value);
            if (field === "ui_inv_outfit_speed") return value + "%";
            if (field === "st_prop_restore_health" || field === "st_prop_restore_bleeding") return parseFloat(value.toFixed(4)).toString();
            if (field === "st_data_export_restore_radiation") return parseFloat(value.toFixed(4)) + " " + this.tUnit("st_data_export_restore_radiation");
            if (field === "ui_inv_outfit_power_restore") return parseFloat(value.toFixed(2)) + "%";
            return value;
        },

        factionLabel(id) {
            return this.t(id) || id;
        },

        buildSlotColor(slot) {
            return SLOT_COLORS[slot] || "#888";
        },

        buildBarSegments(segments, total) {
            if (!total || total <= 0) return [];
            const result = [];
            for (const slot of ["outfit", "helmet", "backpack", "belt", "artifact", "weapon", "ammo"]) {
                const v = Math.abs(segments[slot] || 0);
                if (v <= 0) continue;
                const pct = (v / Math.abs(total)) * 100;
                result.push({ slot, pct, color: SLOT_COLORS[slot] });
            }
            return result;
        },

        getBuildStorageKey() {
            if (!this.activePack) return "build";
            return `build:${this.activePack.id}`;
        },

        saveBuildToStorage() {
            const data = {
                outfit: this.buildOutfit?.id || null,
                helmet: this.buildHelmet?.id || null,
                backpack: this.buildBackpack?.id || null,
                belts: this.buildBelts.map(b => b.id),
                artifacts: this.buildArtifacts.map(a => a.id),
                weapon1: this.buildWeaponPrimary?.id || null,
                weapon2: this.buildWeaponSecondary?.id || null,
                sidearm: this.buildWeaponSidearm?.id || null,
                grenade: this.buildWeaponGrenade?.id || null,
                ammo1: this.buildAmmoPrimary?.id || null,
                ammo2: this.buildAmmoSecondary?.id || null,
                ammoSidearm: this.buildAmmoSidearm?.id || null,
            };
            try {
                localStorage.setItem(this.getBuildStorageKey(), JSON.stringify(data));
            } catch (e) { /* quota */ }
        },

        loadBuildFromStorage() {
            try {
                const raw = localStorage.getItem(this.getBuildStorageKey());
                if (!raw) return;
                const data = JSON.parse(raw);
                this.restoreBuildFromIds(data);
            } catch (e) { /* ignore */ }
        },

        restoreBuildFromIds(data) {
            const findItem = (id, slug) => {
                if (!id) return null;
                const items = this.categoryItems[slug] || [];
                return items.find(i => i.id === id) || null;
            };
            const findWeapon = (id, slugs) => {
                if (!id) return null;
                for (const slug of slugs) {
                    const found = findItem(id, slug);
                    if (found) return found;
                }
                return null;
            };
            this.buildOutfit = findItem(data.outfit, "outfits");
            this.buildHelmet = findItem(data.helmet, "helmets");
            this.buildBackpack = findItem(data.backpack, "belt-attachments");
            this.buildBelts = (data.belts || []).map(id => findItem(id, "belt-attachments")).filter(Boolean);
            this.buildArtifacts = (data.artifacts || []).map(id => findItem(id, "artefacts")).filter(Boolean);
            this.buildWeaponPrimary = findWeapon(data.weapon1, PRIMARY_WEAPON_SLUGS);
            this.buildWeaponSecondary = findWeapon(data.weapon2, PRIMARY_WEAPON_SLUGS);
            this.buildWeaponSidearm = findWeapon(data.sidearm, SIDEARM_SLUGS);
            this.buildWeaponGrenade = findItem(data.grenade, GRENADE_SLUG);
            this.buildAmmoPrimary = findItem(data.ammo1, "ammo");
            this.buildAmmoSecondary = findItem(data.ammo2, "ammo");
            this.buildAmmoSidearm = findItem(data.ammoSidearm, "ammo");
            // Restore inventory if present
            if (data.inventory && data.inventory.length) {
                const findAny = (id) => {
                    for (const slug of [...PRIMARY_WEAPON_SLUGS, ...SIDEARM_SLUGS, GRENADE_SLUG, "outfits", "helmets", "belt-attachments", "artefacts", "ammo"]) {
                        const item = findItem(id, slug);
                        if (item) return item;
                    }
                    return null;
                };
                this.buildInventory = data.inventory
                    .map(e => {
                        const item = findAny(e.id);
                        return item ? { item, slotType: e.slotType } : null;
                    })
                    .filter(Boolean);
                this.saveInventoryToStorage();
            }
        },

        getSavedBuildsKey() {
            if (!this.activePack) return "builds";
            return `builds:${this.activePack.id}`;
        },

        loadSavedBuilds() {
            try {
                const raw = localStorage.getItem(this.getSavedBuildsKey());
                this.buildSavedBuilds = raw ? JSON.parse(raw) : [];
            } catch (e) {
                this.buildSavedBuilds = [];
            }
        },

        saveCurrentBuild() {
            const name = this.buildSaveName.trim();
            if (!name) return;
            const data = {
                name,
                playerName: this.buildPlayerName,
                playerFaction: this.buildPlayerFaction,
                outfit: this.buildOutfit?.id || null,
                helmet: this.buildHelmet?.id || null,
                backpack: this.buildBackpack?.id || null,
                belts: this.buildBelts.map(b => b.id),
                artifacts: this.buildArtifacts.map(a => a.id),
                weapon1: this.buildWeaponPrimary?.id || null,
                weapon2: this.buildWeaponSecondary?.id || null,
                sidearm: this.buildWeaponSidearm?.id || null,
                grenade: this.buildWeaponGrenade?.id || null,
                ammo1: this.buildAmmoPrimary?.id || null,
                ammo2: this.buildAmmoSecondary?.id || null,
                ammoSidearm: this.buildAmmoSidearm?.id || null,
                timestamp: Date.now(),
            };
            // Replace if same name exists
            const idx = this.buildSavedBuilds.findIndex(b => b.name === name);
            if (idx >= 0) {
                this.buildSavedBuilds[idx] = data;
            } else {
                if (this.buildSavedBuilds.length >= MAX_SAVED_BUILDS) {
                    this.buildSavedBuilds.pop();
                }
                this.buildSavedBuilds.unshift(data);
            }
            try {
                localStorage.setItem(this.getSavedBuildsKey(), JSON.stringify(this.buildSavedBuilds));
            } catch (e) { /* quota */ }
            this.buildSaveName = "";
            this.buildSaveModalOpen = false;
        },

        loadSavedBuild(build) {
            if (build.playerName) this.buildPlayerName = build.playerName;
            if (build.playerFaction) this.buildPlayerFaction = build.playerFaction;
            this.restoreBuildFromIds(build);
            this.saveBuildToStorage();
            this.pushUrlState();
        },

        deleteSavedBuild(index) {
            this.buildSavedBuilds.splice(index, 1);
            try {
                localStorage.setItem(this.getSavedBuildsKey(), JSON.stringify(this.buildSavedBuilds));
            } catch (e) { /* quota */ }
        },

        async releaseNotesHash(data) {
            const text = JSON.stringify(data[0]);
            const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
        },

        // ── What's New & Feature Callouts ──

        initWhatsNew(rnData, hash) {
            const seen = localStorage.getItem("whatsNewHash");
            if (seen === hash) return;

            // Count all unseen entries, collect highlighted and callouts
            let totalCount = 0;
            const highlighted = [];
            const callouts = [];
            for (const release of rnData) {
                totalCount += release.entries.length;
                for (const entry of release.entries) {
                    if (entry.highlight) highlighted.push(entry);
                    if (entry.callout) callouts.push(entry.callout);
                }
            }
            if (!highlighted.length && !callouts.length) return;

            this._whatsNewHash = hash;
            this.whatsNewTotalCount = totalCount;
            this.whatsNewEntries = highlighted;
            if (highlighted.length) this.whatsNewVisible = true;

            // Collect callout definitions from all entries
            this._calloutDefs = callouts;

            // Load previously dismissed callouts
            try {
                this._calloutDismissed = new Set(JSON.parse(localStorage.getItem("calloutsDismissed") || "[]"));
            } catch (e) { this._calloutDismissed = new Set(); }

            // Show first visible callout after a short delay
            this.$nextTick(() => this.checkCallouts());
        },

        whatsNewEmoji(type) {
            return { added: "\u2728", changed: "\uD83D\uDD27", fixed: "\uD83D\uDC1B" }[type] || "\u2728";
        },

        whatsNewAction(entry) {
            if (!entry.action) return;
            if (entry.action === "buildPlanner") {
                this.whatsNewVisible = false;
                this.openBuildPlanner();
            }
        },

        dismissWhatsNew() {
            this.whatsNewVisible = false;
            try {
                if (this._whatsNewHash) localStorage.setItem("whatsNewHash", this._whatsNewHash);
            } catch (e) { /* quota */ }
        },

        checkCallouts() {
            if (!this._calloutDefs || this.calloutActive) return;
            for (const step of this._calloutDefs) {
                if (this._calloutDismissed.has(step.selector)) continue;
                const target = document.querySelector(step.selector);
                if (target && target.offsetParent !== null) {
                    this.calloutCurrent = step;
                    this.calloutActive = true;
                    this.$nextTick(() => this.positionCallout());
                    return;
                }
            }
        },

        dismissCallout() {
            if (this.calloutCurrent) {
                this._calloutDismissed.add(this.calloutCurrent.selector);
                try {
                    localStorage.setItem("calloutsDismissed", JSON.stringify([...this._calloutDismissed]));
                } catch (e) { /* quota */ }
            }
            this.calloutActive = false;
            this.calloutCurrent = null;
        },

        positionCallout() {
            const step = this.calloutCurrent;
            if (!step) return;
            const target = document.querySelector(step.selector);
            if (!target || target.offsetParent === null) {
                this.dismissCallout();
                return;
            }

            const rect = target.getBoundingClientRect();
            const pad = 6;

            this.calloutSpotlightStyle = {
                top: (rect.top - pad) + "px",
                left: (rect.left - pad) + "px",
                width: (rect.width + pad * 2) + "px",
                height: (rect.height + pad * 2) + "px",
            };

            const popover = this.$refs.calloutPopover;
            const arrowEl = this.$refs.calloutArrow;
            if (!popover) return;

            FloatingUIDOM.computePosition(target, popover, {
                placement: step.placement || "bottom",
                middleware: [
                    FloatingUIDOM.offset(16),
                    FloatingUIDOM.flip({ fallbackPlacements: ["top", "right", "left"] }),
                    FloatingUIDOM.shift({ padding: 12 }),
                    FloatingUIDOM.arrow({ element: arrowEl }),
                ],
            }).then(({ x, y, placement, middlewareData }) => {
                this.calloutPopoverStyle = {
                    top: y + "px",
                    left: x + "px",
                };
                const side = { top: "bottom", bottom: "top", left: "right", right: "left" }[placement.split("-")[0]];
                this.calloutArrowSide = side;
                if (middlewareData.arrow) {
                    const ax = middlewareData.arrow.x;
                    const ay = middlewareData.arrow.y;
                    this.calloutArrowStyle = {
                        left: ax != null ? ax + "px" : "",
                        top: ay != null ? ay + "px" : "",
                    };
                }
            });
        },

        getBuildShareData() {
            return {
                outfit: this.buildOutfit?.id || null,
                helmet: this.buildHelmet?.id || null,
                backpack: this.buildBackpack?.id || null,
                belts: this.buildBelts.map(b => b.id),
                artifacts: this.buildArtifacts.map(a => a.id),
                weapon1: this.buildWeaponPrimary?.id || null,
                weapon2: this.buildWeaponSecondary?.id || null,
                sidearm: this.buildWeaponSidearm?.id || null,
                grenade: this.buildWeaponGrenade?.id || null,
                ammo1: this.buildAmmoPrimary?.id || null,
                ammo2: this.buildAmmoSecondary?.id || null,
                ammoSidearm: this.buildAmmoSidearm?.id || null,
                inventory: this.buildInventory.map(e => ({ id: e.item.id, slotType: e.slotType })),
            };
        },

        async shareBuild() {
            const data = this.getBuildShareData();
            data.pack = this.activePack?.id || null;
            const res = await fetch("/api/build", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to share build");
            const { code } = await res.json();
            return code;
        },

        async loadSharedBuild(code) {
            const res = await fetch(`/api/build/${encodeURIComponent(code)}`);
            if (!res.ok) return null;
            return await res.json();
        },

        async copyBuildLink() {
            this.buildSharing = true;
            const minDelay = new Promise(r => setTimeout(r, 2000));
            try {
                const code = await this.shareBuild();
                await minDelay;
                const url = new URL(window.location.origin + window.location.pathname);
                url.hash = BUILD_HASH_PREFIX + code;
                await this.copyToClipboard(url.toString(), "copyBuildLinkFeedback");
            } catch {
                await minDelay;
                this.showToast(this.t("app_build_share_error"));
            } finally {
                this.buildSharing = false;
            }
        },

        async copyBuildCode() {
            this.buildSharing = true;
            const minDelay = new Promise(r => setTimeout(r, 2000));
            try {
                const code = await this.shareBuild();
                await minDelay;
                await this.copyToClipboard(code, "copyBuildCodeFeedback");
            } catch {
                await minDelay;
                this.showToast(this.t("app_build_share_error"));
            } finally {
                this.buildSharing = false;
            }
        },

        async importBuildFromCode() {
            let code = this.buildImportCode.trim();
            if (!code) return;
            // Extract code from URL if pasted
            try {
                const url = new URL(code);
                if (url.hash.startsWith("#" + BUILD_HASH_PREFIX)) code = url.hash.slice(1 + BUILD_HASH_PREFIX.length);
            } catch { /* not a URL, use as-is */ }

            this.buildSharing = true;
            try {
                const data = await this.loadSharedBuild(code);
                if (!data) {
                    this.buildImportError = this.t("app_build_import_error") || "Invalid build code";
                    return;
                }
                this.buildImportError = "";
                this.buildImportCode = "";
                this.buildImportCodeModalOpen = false;
                this.restoreBuildFromIds(data);
                this.saveBuildToStorage();
            } catch {
                this.buildImportError = this.t("app_build_import_error") || "Invalid build code";
            } finally {
                this.buildSharing = false;
            }
        },

        // Extract character name from save filename (e.g. "tak - quicksave_2.scop" -> "tak")
        // Returns empty string for autosaves and other files without the name prefix.
        extractCharNameFromFilename(filename) {
            const match = filename.match(/^(.+?)\s*-\s*(?:quicksave|autosave|save|manual)/i);
            return match ? match[1].trim() : "";
        },

        // --- Save file import ---

        openSaveImport() {
            this.saveImportModalOpen = true;
            this.saveImportParsing = false;
            this.saveImportError = "";
            this.saveImportPreview = null;
            this.saveImportFileName = "";
        },

        closeSaveImport() {
            this.saveImportModalOpen = false;
            this.saveImportPreview = null;
            this.saveImportError = "";
        },

        handleSaveImportDrop(event) {
            event.preventDefault();
            const files = event.dataTransfer?.files;
            if (files?.length) this.parseSaveFiles(files);
        },

        handleSaveImportFile(event) {
            const files = event.target?.files;
            if (files?.length) this.parseSaveFiles(files);
            event.target.value = "";
        },

        async parseSaveFiles(fileList) {
            let scopFile = null, scocFile = null;
            for (const f of fileList) {
                const name = f.name.toLowerCase();
                if (name.endsWith(".scop")) scopFile = f;
                else if (name.endsWith(".scoc")) scocFile = f;
            }
            if (!scopFile) {
                this.saveImportError = this.t("app_save_import_error_filetype") || "Please select a .scop save file";
                return;
            }
            if (scopFile.size > 50 * 1024 * 1024) {
                this.saveImportError = this.t("app_save_import_error_size") || "Save file too large (>50 MB)";
                return;
            }
            await this.parseSaveFile(scopFile, scocFile);
        },

        async parseSaveFile(file, scocFile) {

            this.saveImportParsing = true;
            this.saveImportError = "";
            this.saveImportPreview = null;
            this.saveImportFileName = file.name;

            try {
                const buffer = await file.arrayBuffer();
                const knownIds = new Set(this.index.map(e => e.id));
                const result = ScopParser.parse(buffer, knownIds);

                // Parse .scoc for equipped state if provided
                let scocData = null;
                if (scocFile) {
                    try {
                        const scocBuffer = await scocFile.arrayBuffer();
                        scocData = ScocParser.parse(scocBuffer);
                    } catch (e) { /* .scoc parsing is optional */ }
                }

                if (result.items.length === 0 && result.stashItems.length === 0) {
                    this.saveImportError = this.t("app_save_import_error_empty") || "No recognized items found in actor inventory or stash";
                    this.saveImportParsing = false;
                    return;
                }

                // Build category lookup from index
                const catMap = {};
                for (const entry of this.index) catMap[entry.id] = entry.category;

                // Belt item IDs from .scoc (if available)
                const beltItemIds = scocData ? scocData.beltItemIds : null;

                // Categorize items into loadout (equipped) vs inventory (carried)
                const preview = {
                    // Loadout: items we can confidently assign to build slots
                    outfit: null,
                    helmet: null,
                    backpack: null,
                    weapons: [],      // primary-type weapons (max 2)
                    sidearms: [],     // pistols/melee (max 1)
                    grenades: [],     // explosives (max 1)
                    belts: [],        // belt attachments equipped (from .scoc)
                    artifacts: [],    // artifacts equipped in belt (from .scoc)
                    // Inventory: items carried but not necessarily equipped
                    inventory: { weapons: [], sidearms: [], grenades: [], belts: [], artifacts: [], outfits: [], helmets: [] },
                    ammo: [],
                    skipped: [],      // food, medicine, etc. (not build-relevant)
                    stash: { weapons: [], sidearms: [], grenades: [], helmets: [], outfits: [], belts: [], artifacts: [], ammo: [] },
                    totalItems: result.items.length,
                    stashCount: result.stashItems.length,
                    objectCount: result.objectCount,
                    actorName: this.extractCharNameFromFilename(file.name),
                };

                const categorizeBuildItem = (sectionName) => {
                    const cat = catMap[sectionName];
                    const slug = cat ? categorySlug(cat) : "";
                    if (cat === "Outfits") return "outfits";
                    if (cat === "Helmets") return "helmets";
                    if (cat === "Belt Attachments") return "belts";
                    if (cat === "Artefacts") return "artifacts";
                    if (cat === "Ammo") return "ammo";
                    if (cat === "Explosives") return "grenades";
                    if (PRIMARY_WEAPON_SLUGS.includes(slug)) return "weapons";
                    if (SIDEARM_SLUGS.includes(slug)) return "sidearms";
                    return null;
                };

                // Helper to deduplicate: only add if not already present
                const addUnique = (arr, id) => { if (!arr.includes(id)) arr.push(id); };

                // Collect all raw ammo from inventory and stash, filter later
                const rawAmmoInv = [];
                const rawAmmoStash = [];

                for (const item of result.items) {
                    const cat = catMap[item.sectionName];
                    const slug = cat ? categorySlug(cat) : "";
                    if (cat === "Outfits") {
                        if (!preview.outfit) preview.outfit = item.sectionName;
                        else addUnique(preview.inventory.outfits, item.sectionName);
                    } else if (cat === "Helmets") {
                        if (!preview.helmet) preview.helmet = item.sectionName;
                        else addUnique(preview.inventory.helmets, item.sectionName);
                    } else if (cat === "Belt Attachments") {
                        const fullItem = (this.categoryItems["belt-attachments"] || []).find(i => i.id === item.sectionName);
                        if (fullItem && isBackpack(fullItem)) {
                            if (!preview.backpack) preview.backpack = item.sectionName;
                        } else {
                            addUnique(preview.inventory.belts, item.sectionName);
                        }
                    } else if (cat === "Artefacts") {
                        if (beltItemIds && beltItemIds.has(item.id)) {
                            addUnique(preview.artifacts, item.sectionName);
                        } else {
                            addUnique(preview.inventory.artifacts, item.sectionName);
                        }
                    } else if (PRIMARY_WEAPON_SLUGS.includes(slug)) {
                        if (preview.weapons.length < 2 && !preview.weapons.includes(item.sectionName)) {
                            preview.weapons.push(item.sectionName);
                        } else {
                            addUnique(preview.inventory.weapons, item.sectionName);
                        }
                    } else if (SIDEARM_SLUGS.includes(slug)) {
                        if (preview.sidearms.length < 1 && !preview.sidearms.includes(item.sectionName)) {
                            preview.sidearms.push(item.sectionName);
                        } else {
                            addUnique(preview.inventory.sidearms, item.sectionName);
                        }
                    } else if (cat === "Explosives") {
                        if (preview.grenades.length < 1 && !preview.grenades.includes(item.sectionName)) {
                            preview.grenades.push(item.sectionName);
                        } else {
                            addUnique(preview.inventory.grenades, item.sectionName);
                        }
                    } else if (cat === "Ammo") {
                        rawAmmoInv.push(item.sectionName);
                    } else {
                        preview.skipped.push(item.sectionName);
                    }
                }

                // Categorize stash items (build-relevant only, deduplicated)
                for (const item of result.stashItems) {
                    const bucket = categorizeBuildItem(item.sectionName);
                    if (bucket === "ammo") {
                        rawAmmoStash.push(item.sectionName);
                    } else if (bucket && preview.stash[bucket]) {
                        addUnique(preview.stash[bucket], item.sectionName);
                    }
                }

                // Build weapon->loaded ammo map and compatible ammo set
                // First, build a map of sectionName -> ammoTypeIndex from parsed items
                const wpnAmmoIdx = {};
                for (const item of [...result.items, ...result.stashItems]) {
                    if (item.ammoTypeIndex >= 0) wpnAmmoIdx[item.sectionName] = item.ammoTypeIndex;
                    // Also map resolved names for addon-stripped weapons
                    const ai = item.sectionName.indexOf("_wpn_addon_");
                    if (ai > 0 && item.ammoTypeIndex >= 0) {
                        const base = item.sectionName.substring(0, ai);
                        wpnAmmoIdx[base] = item.ammoTypeIndex;
                    }
                }

                const allWeaponIds = [...preview.weapons, ...preview.sidearms, ...preview.inventory.weapons, ...preview.inventory.sidearms, ...preview.stash.weapons, ...preview.stash.sidearms];
                const compatibleAmmo = new Set();
                const allWeaponSlugs = [...PRIMARY_WEAPON_SLUGS, ...SIDEARM_SLUGS];
                preview.weaponAmmo = {}; // weaponSectionName -> loaded ammo ID
                for (const wpnId of allWeaponIds) {
                    for (const slug of allWeaponSlugs) {
                        const wpn = (this.categoryItems[slug] || []).find(i => i.id === wpnId);
                        if (wpn) {
                            const types = (wpn.ui_ammo_types || "").split(";").filter(Boolean);
                            const alt = (wpn.st_data_export_ammo_types_alt || "").split(";").filter(Boolean);
                            const allTypes = [...types, ...alt];
                            for (const t of allTypes) compatibleAmmo.add(t.replace(/-/g, "_"));
                            // Resolve loaded ammo from ammoTypeIndex
                            const idx = wpnAmmoIdx[wpnId];
                            if (idx !== undefined && idx >= 0 && idx < allTypes.length) {
                                preview.weaponAmmo[wpnId] = allTypes[idx].replace(/-/g, "_");
                            }
                            break;
                        }
                    }
                }

                // Filter ammo to only compatible types, deduplicated
                for (const id of rawAmmoInv) {
                    if (compatibleAmmo.has(id)) addUnique(preview.ammo, id);
                }
                for (const id of rawAmmoStash) {
                    if (compatibleAmmo.has(id)) addUnique(preview.stash.ammo, id);
                }

                preview.missingSCOC = !scocFile;
                this.saveImportPreview = preview;
            } catch (e) {
                this.saveImportError = e.message || "Failed to parse save file";
            } finally {
                this.saveImportParsing = false;
            }
        },

        saveImportItemName(sectionName) {
            const entry = this.index.find(e => e.id === sectionName);
            if (!entry) return sectionName;
            return this.t(entry.name) || entry.displayName || sectionName;
        },

        saveImportResolveItem(sectionName) {
            const entry = this.index.find(e => e.id === sectionName);
            if (!entry) return null;
            const slug = categorySlug(entry.category);
            return (this.categoryItems[slug] || []).find(i => i.id === sectionName) || null;
        },

        saveImportHover(sectionName, event) {
            const item = this.saveImportResolveItem(sectionName);
            if (item) this.showBuildHover(item, event);
        },

        confirmSaveImport() {
            const p = this.saveImportPreview;
            if (!p) return;

            this.clearBuild();

            if (p.actorName) {
                this.buildPlayerName = p.actorName;
            }

            // Build data object for restoreBuildFromIds
            const data = {
                outfit: p.outfit || null,
                helmet: p.helmet || null,
                backpack: p.backpack || null,
                belts: p.belts || [],
                artifacts: p.artifacts || [],
                weapon1: p.weapons[0] || null,
                weapon2: p.weapons[1] || null,
                sidearm: p.sidearms[0] || null,
                grenade: p.grenades[0] || null,
                ammo1: (p.weaponAmmo && p.weapons[0] && p.weaponAmmo[p.weapons[0]]) || null,
                ammo2: (p.weaponAmmo && p.weapons[1] && p.weaponAmmo[p.weapons[1]]) || null,
                ammoSidearm: (p.weaponAmmo && p.sidearms[0] && p.weaponAmmo[p.sidearms[0]]) || null,
                inventory: [],
            };

            // Add carried inventory items (artifacts, belts, extra weapons, etc.)
            const invSlotTypes = { weapons: "weapon", sidearms: "sidearm", grenades: "grenade", belts: "belt", artifacts: "artifact", outfits: "outfit", helmets: "helmet" };
            for (const [bucket, slotType] of Object.entries(invSlotTypes)) {
                for (const id of (p.inventory[bucket] || [])) {
                    data.inventory.push({ id, slotType });
                }
            }
            // Add ammo to inventory (already deduplicated and filtered to compatible)
            if (this.saveImportIncludeAmmo) {
                for (const id of p.ammo) {
                    data.inventory.push({ id, slotType: "ammo" });
                }
            }
            // Add stash items to inventory if enabled (already deduplicated)
            if (this.saveImportIncludeStash) {
                const seen = new Set([...p.weapons, ...p.sidearms, ...p.grenades, ...p.ammo, ...p.belts, ...p.artifacts, p.outfit, p.helmet, p.backpack, ...Object.values(p.inventory).flat()].filter(Boolean));
                const stashSlotTypes = { weapons: "weapon", sidearms: "sidearm", grenades: "grenade", helmets: "helmet", outfits: "outfit", belts: "belt", artifacts: "artifact", ammo: "ammo" };
                for (const [bucket, slotType] of Object.entries(stashSlotTypes)) {
                    if (bucket === "ammo" && !this.saveImportIncludeAmmo) continue;
                    for (const id of (p.stash[bucket] || [])) {
                        if (!seen.has(id)) {
                            seen.add(id);
                            data.inventory.push({ id, slotType });
                        }
                    }
                }
            }

            this.restoreBuildFromIds(data);
            this.saveBuildToStorage();
            this.pushUrlState();
            this.closeSaveImport();
        },

        // Legacy URL param support for backwards compatibility with old shared links
        restoreBuildFromUrl(params) {
            if (params.get("pn")) this.buildPlayerName = params.get("pn");
            if (params.get("pf")) this.buildPlayerFaction = params.get("pf");
            const data = {
                outfit: params.get("outfit") || null,
                helmet: params.get("helmet") || null,
                backpack: params.get("backpack") || null,
                belts: params.get("belt") ? params.get("belt").split(",") : [],
                artifacts: params.get("arts") ? params.get("arts").split(",") : [],
                weapon1: params.get("wp") || params.get("w1") || null,
                weapon2: params.get("ws") || params.get("w2") || null,
                sidearm: params.get("wsi") || null,
                grenade: params.get("wg") || null,
                ammo1: params.get("ap") || params.get("a1") || null,
                ammo2: params.get("as") || params.get("a2") || null,
                ammoSidearm: params.get("asi") || null,
            };
            if (data.outfit || data.helmet || data.backpack || data.belts.length || data.artifacts.length || data.weapon1 || data.weapon2 || data.sidearm || data.grenade) {
                this.restoreBuildFromIds(data);
                this.saveBuildToStorage();
            }
        },

        // Inventory methods
        resolveInventoryItem(item, slotType) {
            if (!item || !item.id) return null;

            const bySlotType = {
                outfit: ["outfits"],
                helmet: ["helmets"],
                backpack: ["belt-attachments"],
                belt: ["belt-attachments"],
                artifact: ["artefacts"],
                weapon: PRIMARY_WEAPON_SLUGS,
                sidearm: SIDEARM_SLUGS,
                grenade: [GRENADE_SLUG],
                ammo: ["ammo"],
            };

            const findBySlugs = (slugs) => {
                for (const slug of slugs || []) {
                    const match = (this.categoryItems[slug] || []).find(i => i.id === item.id);
                    if (match) return match;
                }
                return null;
            };

            const hinted = findBySlugs(bySlotType[slotType] || []);
            if (hinted) return hinted;

            const inferredSlot = this.getItemSlotType(item);
            const inferred = findBySlugs(bySlotType[inferredSlot] || []);
            return inferred || item;
        },

        addToInventory(item, slotType) {
            const resolvedItem = this.resolveInventoryItem(item, slotType);
            if (!resolvedItem) return;
            const resolvedSlotType = slotType || this.getItemSlotType(resolvedItem);
            if (!resolvedSlotType) return;
            if (this.buildInventory.some(e => e.item.id === resolvedItem.id)) return;
            this.buildInventory.push({ item: resolvedItem, slotType: resolvedSlotType });
        },

        getItemSlotType(item) {
            if (!item) return null;
            // Check artefacts first to avoid misclassifying as belt
            const checks = [
                ["artefacts", "artifact"],
                ["outfits", "outfit"],
                ["helmets", "helmet"],
                ["belt-attachments", "belt"],
            ];
            for (const [slug, type] of checks) {
                const items = this.categoryItems[slug] || [];
                if (items.some(i => i.id === item.id)) {
                    if (slug === "belt-attachments") return isBackpack(item) ? "backpack" : "belt";
                    return type;
                }
            }
            // Check sidearm categories (pistols + melee)
            for (const slug of SIDEARM_SLUGS) {
                const items = this.categoryItems[slug] || [];
                if (items.some(i => i.id === item.id)) return "sidearm";
            }
            // Check grenade/explosives
            const grenadeItems = this.categoryItems[GRENADE_SLUG] || [];
            if (grenadeItems.some(i => i.id === item.id)) return "grenade";
            // Check primary weapon categories
            for (const slug of PRIMARY_WEAPON_SLUGS) {
                const items = this.categoryItems[slug] || [];
                if (items.some(i => i.id === item.id)) return "weapon";
            }
            // Check ammo
            const ammoItems = this.categoryItems["ammo"] || [];
            if (ammoItems.some(i => i.id === item.id)) return "ammo";
            return null;
        },

        getInventoryStorageKey() {
            if (!this.activePack) return "inventory";
            return `inventory:${this.activePack.id}`;
        },

        saveInventoryToStorage() {
            const data = this.buildInventory.map(entry => ({ id: entry.item.id, slotType: entry.slotType }));
            try {
                localStorage.setItem(this.getInventoryStorageKey(), JSON.stringify(data));
            } catch (e) { /* quota */ }
        },

        loadInventoryFromStorage() {
            try {
                const raw = localStorage.getItem(this.getInventoryStorageKey());
                if (!raw) return;
                const data = JSON.parse(raw);
                this.buildInventory = data.map(entry => {
                    if (entry.slotType === "weapon") {
                        for (const slug of PRIMARY_WEAPON_SLUGS) {
                            const items = this.categoryItems[slug] || [];
                            const item = items.find(i => i.id === entry.id);
                            if (item) return { item, slotType: "weapon" };
                        }
                        return null;
                    }
                    if (entry.slotType === "sidearm") {
                        for (const slug of SIDEARM_SLUGS) {
                            const items = this.categoryItems[slug] || [];
                            const item = items.find(i => i.id === entry.id);
                            if (item) return { item, slotType: "sidearm" };
                        }
                        return null;
                    }
                    if (entry.slotType === "grenade") {
                        const items = this.categoryItems[GRENADE_SLUG] || [];
                        const item = items.find(i => i.id === entry.id);
                        return item ? { item, slotType: "grenade" } : null;
                    }
                    if (entry.slotType === "ammo") {
                        const items = this.categoryItems["ammo"] || [];
                        const item = items.find(i => i.id === entry.id);
                        return item ? { item, slotType: "ammo" } : null;
                    }
                    const slugMap = { outfit: "outfits", helmet: "helmets", backpack: "belt-attachments", belt: "belt-attachments", artifact: "artefacts" };
                    const slug = slugMap[entry.slotType];
                    const items = this.categoryItems[slug] || [];
                    const item = items.find(i => i.id === entry.id);
                    return item ? { item, slotType: entry.slotType } : null;
                }).filter(Boolean);
            } catch (e) { this.buildInventory = []; }
        },

        addFavoritesToInventory() {
            const favSet = new Set(this.favoriteIds);
            const existingIds = new Set(this.buildInventory.map(e => e.item.id));
            const items = this.index.filter(i => favSet.has(i.id) && !existingIds.has(i.id));
            let added = 0;
            for (const item of items) {
                const slotType = this.getItemSlotType(item);
                if (slotType) {
                    this.addToInventory(item, slotType);
                    added++;
                }
            }
            if (added) this.saveInventoryToStorage();
        },

        setWeaponCompareSlot(slot) {
            this.buildWeaponCompareSlot = slot;
            try { localStorage.setItem("buildWeaponCompareSlot", slot); } catch (e) { /* quota */ }
        },

        cycleInventorySort() {
            const order = ["none", "name", "category"];
            this.buildInventorySort = order[(order.indexOf(this.buildInventorySort) + 1) % order.length];
            try { localStorage.setItem("buildInventorySort", this.buildInventorySort); } catch (e) { /* quota */ }
        },

        openInventoryPicker() {
            this.buildPickerSlot = { type: "inventory" };
            this.buildPickerQuery = "";
            // Combine all equipment + weapon + ammo categories into one Fuse instance
            const slugs = ["outfits", "helmets", "belt-attachments", "artefacts", ...WEAPON_CATEGORY_SLUGS, GRENADE_SLUG, "ammo"];
            let allItems = [];
            for (const slug of slugs) {
                allItems = allItems.concat(this.categoryItems[slug] || []);
            }
            this.buildPickerFuse = new Fuse(allItems, {
                keys: ["displayName", "pda_encyclopedia_name", "localeName", "id"],
                threshold: 0.35,
            });
            this.buildPickerOpen = true;
            document.body.style.overflow = "hidden";
        },

        inventorySlotTypeLabel(slotType) {
            const map = { outfit: "app_type_outfit", helmet: "app_type_helmet", backpack: "app_type_backpack", belt: "app_type_belt_attachment", artifact: "app_type_artefact", weapon: "app_build_weapon", sidearm: "app_build_sidearm", grenade: "app_build_grenade", ammo: "app_build_ammo" };
            return this.t(map[slotType]) || slotType;
        },

        parseDescription(item) {
            if (!item?.st_data_export_description) return null;
            const raw = this.t(item.st_data_export_description);
            // Content uses literal \n (backslash + n), not actual newlines
            const NL = /\x5cn/g; // matches literal backslash-n
            const NLNL = /\x5cn\s*\x5cn/; // matches \n \n paragraph break
            // Split on paragraph breaks to separate prose from metadata sections
            const parts = raw.split(NLNL);
            const text = parts[0].replace(NL, " ").trim();
            const sections = [];
            const ucFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
            for (let i = 1; i < parts.length; i++) {
                const lines = parts[i].split(NL).map(l => l.trim()).filter(Boolean);
                if (!lines.length) continue;
                const headerLine = lines[0];
                const colonIdx = headerLine.indexOf(":");
                const header = colonIdx >= 0 ? headerLine.slice(0, colonIdx).trim() : headerLine;
                const headerValue = colonIdx >= 0 ? headerLine.slice(colonIdx + 1).trim() : "";
                const items = [];
                if (headerValue) items.push(ucFirst(headerValue));
                for (let j = 1; j < lines.length; j++) {
                    const item = lines[j].replace(/^[\u2022•]\s*/, "").trim();
                    if (!item) continue;
                    const ci = item.indexOf(":");
                    items.push(ci >= 0 ? ucFirst(item.slice(0, ci)) + ":" + item.slice(ci + 1) : ucFirst(item));
                }
                sections.push({ header, items });
            }
            return { text, sections };
        },

        getItemFields(item) {
            if (!item) return [];
            const slotType = this.getItemSlotType(item);
            if (slotType === "weapon" || slotType === "sidearm" || slotType === "grenade") {
                const searchSlugs = slotType === "sidearm" ? SIDEARM_SLUGS : slotType === "grenade" ? [GRENADE_SLUG] : PRIMARY_WEAPON_SLUGS;
                for (const slug of searchSlugs) {
                    const items = this.categoryItems[slug] || [];
                    if (items.some(i => i.id === item.id)) {
                        const headers = this.categoryHeaders[slug] || [];
                        return headers.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total ") && h !== "id");
                    }
                }
                return [];
            }
            if (slotType === "ammo") {
                const headers = this.categoryHeaders["ammo"] || [];
                return headers.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total ") && h !== "id");
            }
            const slugMap = { outfit: "outfits", helmet: "helmets", backpack: "belt-attachments", belt: "belt-attachments", artifact: "artefacts" };
            const slug = slugMap[slotType];
            if (!slug) return [];
            const headers = this.categoryHeaders[slug] || [];
            return headers.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total ") && h !== "id");
        },

        buildHoverCompareFields() {
            if (!this.buildHoverItem || !this.buildHoverCompareItem) return [];
            const hoverFields = this.getItemFields(this.buildHoverItem);
            const equippedFields = this.getItemFields(this.buildHoverCompareItem);
            const seen = new Set(hoverFields);
            const extra = equippedFields.filter(f => !seen.has(f));
            return hoverFields.concat(extra);
        },

        buildHoverDiff(field, hoverItem, equippedItem) {
            const NON_NUMERIC = new Set(["ui_ammo_types", "st_data_export_ammo_types_alt", "ui_mm_repair"]);
            if (NON_NUMERIC.has(field)) return { value: null, positive: false };
            const hv = parseFloat(hoverItem[field]);
            const ev = parseFloat(equippedItem[field]);
            if (isNaN(hv) || isNaN(ev)) return { value: null, positive: false };
            const diff = Math.round((hv - ev) * 1000) / 1000;
            let positive;
            if (HIGHER_IS_WORSE.has(field) || LOWER_IS_BETTER.has(field)) {
                positive = diff < 0;
            } else {
                positive = diff > 0;
            }
            return { value: diff, positive };
        },

        showBuildHover(item, event) {
            clearTimeout(this.buildHoverTimeout);
            this._buildHoverItem = item;
            this._buildHoverMouse = { x: event.clientX, y: event.clientY };

            // Resolve comparison item — only for inventory/picker items, not equipped slots
            let compareItem = null;
            let slotType = null;
            const inInventory = this.buildInventory.some(e => e.item === item);
            const isEquipped = !inInventory && (
                item === this.buildOutfit || item === this.buildHelmet || item === this.buildBackpack
                || item === this.buildWeaponPrimary || item === this.buildWeaponSecondary
                || item === this.buildWeaponSidearm || item === this.buildWeaponGrenade
                || item === this.buildAmmoPrimary || item === this.buildAmmoSecondary || item === this.buildAmmoSidearm
                || this.buildBelts.includes(item) || this.buildArtifacts.includes(item));
            if (!isEquipped) {
                const invEntry = this.buildInventory.find(e => e.item.id === item.id);
                if (invEntry) {
                    slotType = invEntry.slotType;
                } else if (this.buildPickerOpen && this.buildPickerSlot) {
                    slotType = this.buildPickerSlot.type;
                }
            }
            if (slotType === "outfit") compareItem = this.buildOutfit;
            else if (slotType === "helmet") compareItem = this.buildHelmet;
            else if (slotType === "backpack") compareItem = this.buildBackpack;
            else if (slotType === "weapon" || slotType === "sidearm") {
                const map = { primary: this.buildWeaponPrimary, secondary: this.buildWeaponSecondary, sidearm: this.buildWeaponSidearm };
                compareItem = map[this.buildWeaponCompareSlot] || this.buildWeaponPrimary || this.buildWeaponSecondary || this.buildWeaponSidearm;
            }
            else if (slotType === "grenade") compareItem = this.buildWeaponGrenade;
            else if (slotType === "ammo") {
                const map = { primary: this.buildAmmoPrimary, secondary: this.buildAmmoSecondary, sidearm: this.buildAmmoSidearm };
                compareItem = map[this.buildWeaponCompareSlot] || this.buildAmmoPrimary || this.buildAmmoSecondary || this.buildAmmoSidearm;
            }
            if (compareItem && compareItem.id === item.id) compareItem = null;
            this._buildHoverCompareItem = compareItem;

            this.buildHoverTimeout = setTimeout(() => {
                this.buildHoverItem = this._buildHoverItem;
                this.buildHoverCompareItem = this._buildHoverCompareItem;
                this.$nextTick(() => this._updateBuildHoverFloat());
            }, 300);
        },

        moveBuildHover(event) {
            this._buildHoverMouse = { x: event.clientX, y: event.clientY };
            if (!this.buildHoverItem) return;
            this._updateBuildHoverFloat();
        },

        _updateBuildHoverFloat() {
            const popover = document.querySelector('.build-hover-popover');
            if (!popover || !this._buildHoverMouse) return;
            const { x, y } = this._buildHoverMouse;
            const virtualEl = {
                getBoundingClientRect: () => ({ x, y, top: y, left: x, bottom: y, right: x, width: 0, height: 0 }),
            };
            FloatingUIDOM.computePosition(virtualEl, popover, {
                placement: 'right-start',
                strategy: 'fixed',
                middleware: [
                    FloatingUIDOM.offset(16),
                    FloatingUIDOM.flip({ fallbackPlacements: ['left-start', 'right-end', 'left-end'] }),
                    FloatingUIDOM.shift({ padding: 8 }),
                ],
            }).then(({ x: px, y: py }) => {
                this.buildHoverPos = { top: py, left: px };
            });
        },

        hideBuildHover() {
            clearTimeout(this.buildHoverTimeout);
            this._buildHoverItem = null;
            this._buildHoverCompareItem = null;
            this._buildHoverMouse = null;
            this.buildHoverItem = null;
            this.buildHoverCompareItem = null;
            this.buildHoverPos = null;
        },

        equipFromInventory(idx) {
            const entry = this.buildInventory[idx];
            if (!entry) return;
            const { item, slotType } = entry;

            if (slotType === "belt" || slotType === "artifact") {
                if (this.buildBeltSlotUsed >= this.buildBeltSlotMax) return;
                if (slotType === "belt") this.buildBelts.push(item);
                else this.buildArtifacts.push(item);
            } else if (slotType === "outfit") {
                if (this.buildOutfit) {
                    this.addToInventory(this.buildOutfit, "outfit");
                    // Cascade overflow belt/artifact items
                    const newMax = parseInt(item["st_data_export_outfit_artefact_count_max"]) || 0;
                    while (this.buildBelts.length + this.buildArtifacts.length > newMax) {
                        if (this.buildArtifacts.length > 0) {
                            this.addToInventory(this.buildArtifacts.pop(), "artifact");
                        } else {
                            this.addToInventory(this.buildBelts.pop(), "belt");
                        }
                    }
                }
                this.buildOutfit = item;
            } else if (slotType === "helmet") {
                if (this.buildHelmet) {
                    this.addToInventory(this.buildHelmet, "helmet");
                }
                this.buildHelmet = item;
            } else if (slotType === "backpack") {
                if (this.buildBackpack) {
                    this.addToInventory(this.buildBackpack, "backpack");
                }
                this.buildBackpack = item;
            } else if (slotType === "weapon") {
                if (!this.buildWeaponPrimary) {
                    this.buildWeaponPrimary = item;
                } else if (!this.buildWeaponSecondary) {
                    this.buildWeaponSecondary = item;
                } else {
                    this.addToInventory(this.buildWeaponPrimary, "weapon");
                    this.buildAmmoPrimary = null;
                    this.buildWeaponPrimary = item;
                }
            } else if (slotType === "sidearm") {
                if (this.buildWeaponSidearm) {
                    this.addToInventory(this.buildWeaponSidearm, "sidearm");
                    this.buildAmmoSidearm = null;
                }
                this.buildWeaponSidearm = item;
            } else if (slotType === "grenade") {
                if (this.buildWeaponGrenade) {
                    this.addToInventory(this.buildWeaponGrenade, "grenade");
                }
                this.buildWeaponGrenade = item;
            } else if (slotType === "ammo") {
                if (this.buildWeaponPrimary && !this.buildAmmoPrimary && this.getCompatibleAmmo(this.buildWeaponPrimary).some(a => a.id === item.id)) {
                    this.buildAmmoPrimary = item;
                } else if (this.buildWeaponSecondary && !this.buildAmmoSecondary && this.getCompatibleAmmo(this.buildWeaponSecondary).some(a => a.id === item.id)) {
                    this.buildAmmoSecondary = item;
                } else if (this.buildWeaponSidearm && !this.buildAmmoSidearm && !this.isWeaponMelee(this.buildWeaponSidearm) && this.getCompatibleAmmo(this.buildWeaponSidearm).some(a => a.id === item.id)) {
                    this.buildAmmoSidearm = item;
                } else {
                    return;
                }
            }

            this.buildInventory.splice(idx, 1);
            this.saveBuildToStorage();
            this.saveInventoryToStorage();
            this.pushUrlState();
        },

        removeFromInventory(idx) {
            this.buildInventory.splice(idx, 1);
            this.saveInventoryToStorage();
        },

        // Drag-and-drop handlers
        onInventoryDragStart(e, idx) {
            const entry = this.buildInventory[idx];
            const payload = { source: "inventory", slotType: entry.slotType, itemId: entry.item.id, inventoryIndex: idx };
            e.dataTransfer.setData("application/json", JSON.stringify(payload));
            e.dataTransfer.effectAllowed = "move";
            this.buildDragState = { ...payload };
        },

        onSlotDragStart(e, type, idx) {
            let item;
            if (type === "outfit") item = this.buildOutfit;
            else if (type === "helmet") item = this.buildHelmet;
            else if (type === "backpack") item = this.buildBackpack;
            else if (type === "belt") item = this.buildBelts[idx];
            else if (type === "artifact") item = this.buildArtifacts[idx];
            else if (type === "weapon") item = idx === "primary" ? this.buildWeaponPrimary : this.buildWeaponSecondary;
            else if (type === "sidearm") item = this.buildWeaponSidearm;
            else if (type === "grenade") item = this.buildWeaponGrenade;
            else if (type === "ammo") {
                const ammoMap = { primary: this.buildAmmoPrimary, secondary: this.buildAmmoSecondary, sidearm: this.buildAmmoSidearm };
                item = ammoMap[idx];
            }
            if (!item) return;
            const payload = { source: "slot", slotType: type, itemId: item.id, slotIndex: idx };
            e.dataTransfer.setData("application/json", JSON.stringify(payload));
            e.dataTransfer.effectAllowed = "move";
            this.buildDragState = { ...payload };
        },

        onSlotDragOver(e, type, idx) {
            if (!this.buildDragState) return;
            const drag = this.buildDragState;
            // Check type compatibility
            if (drag.slotType !== type) {
                e.dataTransfer.dropEffect = "none";
                return;
            }
            // Check capacity for belt/artifact
            if ((type === "belt" || type === "artifact") && drag.source === "inventory") {
                if (this.buildBeltSlotUsed >= this.buildBeltSlotMax) {
                    e.dataTransfer.dropEffect = "none";
                    return;
                }
            }
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            this.buildDragState = { ...drag, targetSlot: type, targetIndex: idx };
        },

        onSlotDragLeave() {
            if (this.buildDragState) {
                this.buildDragState = { ...this.buildDragState, targetSlot: null, targetIndex: null };
            }
        },

        onSlotDrop(e, type, idx) {
            e.preventDefault();
            let payload;
            try { payload = JSON.parse(e.dataTransfer.getData("application/json")); } catch { return; }
            if (!payload || payload.slotType !== type) return;

            if (payload.source === "inventory") {
                const entry = this.buildInventory[payload.inventoryIndex];
                if (!entry) return;
                const item = entry.item;

                if (type === "outfit" || type === "helmet" || type === "backpack") {
                    // Singular slot: swap old item to inventory
                    const current = type === "outfit" ? this.buildOutfit : type === "helmet" ? this.buildHelmet : this.buildBackpack;
                    if (current) {
                        this.addToInventory(current, type);
                        if (type === "outfit") {
                            const newMax = parseInt(item["st_data_export_outfit_artefact_count_max"]) || 0;
                            while (this.buildBelts.length + this.buildArtifacts.length > newMax) {
                                if (this.buildArtifacts.length > 0) this.addToInventory(this.buildArtifacts.pop(), "artifact");
                                else this.addToInventory(this.buildBelts.pop(), "belt");
                            }
                        }
                    }
                    if (type === "outfit") this.buildOutfit = item;
                    else if (type === "helmet") this.buildHelmet = item;
                    else this.buildBackpack = item;
                } else if (type === "weapon") {
                    const current = idx === "primary" ? this.buildWeaponPrimary : this.buildWeaponSecondary;
                    if (current) this.addToInventory(current, "weapon");
                    if (idx === "primary") { this.buildWeaponPrimary = item; this.buildAmmoPrimary = null; }
                    else { this.buildWeaponSecondary = item; this.buildAmmoSecondary = null; }
                } else if (type === "sidearm") {
                    if (this.buildWeaponSidearm) this.addToInventory(this.buildWeaponSidearm, "sidearm");
                    this.buildWeaponSidearm = item; this.buildAmmoSidearm = null;
                } else if (type === "grenade") {
                    if (this.buildWeaponGrenade) this.addToInventory(this.buildWeaponGrenade, "grenade");
                    this.buildWeaponGrenade = item;
                } else {
                    // Belt/artifact: check capacity
                    if (this.buildBeltSlotUsed >= this.buildBeltSlotMax) return;
                    if (type === "belt") this.buildBelts.push(item);
                    else this.buildArtifacts.push(item);
                }
                this.buildInventory.splice(payload.inventoryIndex, 1);
            } else if (payload.source === "slot") {
                // Drag between slots of same type
                if (type === "weapon" && payload.slotIndex !== idx) {
                    // Swap weapons between slots
                    const temp = this.buildWeaponPrimary;
                    this.buildWeaponPrimary = this.buildWeaponSecondary;
                    this.buildWeaponSecondary = temp;
                    const tempAmmo = this.buildAmmoPrimary;
                    this.buildAmmoPrimary = this.buildAmmoSecondary;
                    this.buildAmmoSecondary = tempAmmo;
                }
                // Other same-type drags: no-op
            }

            this.buildDragState = null;
            this.saveBuildToStorage();
            this.saveInventoryToStorage();
            this.pushUrlState();
        },

        onBeltAreaDragOver(e) {
            if (!this.buildDragState) return;
            const drag = this.buildDragState;
            // Accept belt or artifact from inventory
            if (drag.source === "inventory" && (drag.slotType === "belt" || drag.slotType === "artifact")) {
                if (this.buildBeltSlotUsed >= this.buildBeltSlotMax) {
                    e.dataTransfer.dropEffect = "none";
                    return;
                }
                e.dataTransfer.dropEffect = "move";
                this.buildDragState = { ...drag, targetSlot: "beltarea" };
            }
        },

        onBeltAreaDrop(e) {
            let payload;
            try { payload = JSON.parse(e.dataTransfer.getData("application/json")); } catch { return; }
            if (!payload) return;

            if (payload.source === "inventory" && (payload.slotType === "belt" || payload.slotType === "artifact")) {
                if (this.buildBeltSlotUsed >= this.buildBeltSlotMax) return;
                const entry = this.buildInventory[payload.inventoryIndex];
                if (!entry) return;
                if (payload.slotType === "belt") this.buildBelts.push(entry.item);
                else this.buildArtifacts.push(entry.item);
                this.buildInventory.splice(payload.inventoryIndex, 1);
                this.buildDragState = null;
                this.saveBuildToStorage();
                this.saveInventoryToStorage();
                this.pushUrlState();
            }
        },

        onInventoryDragOver(e) {
            if (!this.buildDragState) return;
            if (this.buildDragState.source !== "slot") return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            this.buildDragState = { ...this.buildDragState, targetSlot: "inventory" };
        },

        onInventoryDrop(e) {
            e.preventDefault();
            let payload;
            try { payload = JSON.parse(e.dataTransfer.getData("application/json")); } catch { return; }
            if (!payload || payload.source !== "slot") return;

            const type = payload.slotType;
            let item;
            if (type === "outfit") {
                item = this.buildOutfit;
                if (!item) return;
                this.addToInventory(item, "outfit");
                this.buildOutfit = null;
                // Cascade belt/artifact to inventory
                for (const b of this.buildBelts) this.addToInventory(b, "belt");
                for (const a of this.buildArtifacts) this.addToInventory(a, "artifact");
                this.buildBelts = [];
                this.buildArtifacts = [];
            } else if (type === "helmet") {
                item = this.buildHelmet;
                if (!item) return;
                this.addToInventory(item, "helmet");
                this.buildHelmet = null;
            } else if (type === "backpack") {
                item = this.buildBackpack;
                if (!item) return;
                this.addToInventory(item, "backpack");
                this.buildBackpack = null;
            } else if (type === "belt") {
                item = this.buildBelts[payload.slotIndex];
                if (!item) return;
                this.addToInventory(item, "belt");
                this.buildBelts.splice(payload.slotIndex, 1);
            } else if (type === "artifact") {
                item = this.buildArtifacts[payload.slotIndex];
                if (!item) return;
                this.addToInventory(item, "artifact");
                this.buildArtifacts.splice(payload.slotIndex, 1);
            } else if (type === "weapon") {
                item = payload.slotIndex === "primary" ? this.buildWeaponPrimary : this.buildWeaponSecondary;
                if (!item) return;
                this.addToInventory(item, "weapon");
                if (payload.slotIndex === "primary") { this.buildWeaponPrimary = null; this.buildAmmoPrimary = null; }
                else { this.buildWeaponSecondary = null; this.buildAmmoSecondary = null; }
            } else if (type === "sidearm") {
                item = this.buildWeaponSidearm;
                if (!item) return;
                this.addToInventory(item, "sidearm");
                this.buildWeaponSidearm = null; this.buildAmmoSidearm = null;
            } else if (type === "grenade") {
                item = this.buildWeaponGrenade;
                if (!item) return;
                this.addToInventory(item, "grenade");
                this.buildWeaponGrenade = null;
            } else if (type === "ammo") {
                const ammoMap = { primary: "buildAmmoPrimary", secondary: "buildAmmoSecondary", sidearm: "buildAmmoSidearm" };
                const prop = ammoMap[payload.slotIndex];
                if (!prop) return;
                item = this[prop];
                if (!item) return;
                this.addToInventory(item, "ammo");
                this[prop] = null;
            }

            this.buildDragState = null;
            this.saveBuildToStorage();
            this.saveInventoryToStorage();
            this.pushUrlState();
        },

        onDragEnd() {
            this.buildDragState = null;
            this.hideBuildHover();
        },
    },

    watch: {
        crossPackId(val) {
            if (val) localStorage.setItem("crossPackId", val);
            else localStorage.removeItem("crossPackId");
            this.loadCrossPackItem(val);
            if (this.versionCompareActive) this.loadVersionCompareData();
        },
        compareViewMode(mode) {
            if (mode === "chart" && this.compareData.length > 0) {
                this.$nextTick(() => this.renderCompareChart());
            }
        },
        compareData() {
            if (this.compareViewMode === "chart") {
                this.$nextTick(() => this.renderCompareChart());
            }
        },
        filterInput() {
            this.debouncedFilterInput();
        },
        filterQuery() {
            if (!this._restoringUrl) this.debouncedPushUrl();
        },
        exchangeFactionFilter() {
            if (!this._restoringUrl) this.pushUrlState();
        },
        buildRadarVisible(visible) {
            if (visible) {
                this.$nextTick(() => this.renderBuildWeaponRadar());
            } else {
                if (this._buildWeaponRadarChart) { this._buildWeaponRadarChart.destroy(); this._buildWeaponRadarChart = null; }
            }
        },
        buildAllItems: {
            deep: true,
            handler() {
                if (this.buildRadarVisible) this.$nextTick(() => this.renderBuildWeaponRadar());
            }
        },
        buildPlayerName() {
            if (this.buildPlannerActive && !this._restoringUrl) this.debouncedPushUrl();
        },
        buildPlayerFaction() {
            if (this.buildPlannerActive && !this._restoringUrl) this.pushUrlState();
        },
        buildSaveModalOpen(open) {
            if (open) {
                this.buildSaveName = this.buildPlayerName || "";
            }
        },
    },

    created() {
        this.debouncedGlobalSearch = debounce(() => this.globalSearch(), 200);
        this.debouncedPushUrl = debounce(() => this.pushUrlState(), 300);
        this.debouncedFilterInput = debounce(() => { this.filterQuery = this.filterInput; }, 200);
    },

    async mounted() {
        window.addEventListener('keydown', (e) => {
            const inInput = e.target.matches('input, textarea, select, [contenteditable]');

            // Ctrl+K / Cmd+K: focus search (works even in inputs)
            if ((e.ctrlKey || e.metaKey) && e.key === KEYS.SEARCH_MOD) {
                e.preventDefault();
                const input = document.querySelector('.global-search input');
                if (input) {
                    if (!this.globalQuery && this.lastGlobalQuery) {
                        this.globalQuery = this.lastGlobalQuery;
                        this.globalSearch();
                    }
                    input.focus();
                    this.$nextTick(() => input.select());
                }
                return;
            }

            // Escape: always active
            if (e.key === KEYS.ESCAPE) {
                if (inInput && e.target.closest('.global-search')) return; // handled by Vue
                this.handleEscape();
                return;
            }

            // Skip single-key shortcuts when typing in an input
            if (inInput) return;

            // Modal-context shortcuts
            if (this.modalOpen && this.modalItem) {
                if (e.key === KEYS.PREV_ITEM) { this.navigateModal(-1); return; }
                if (e.key === KEYS.NEXT_ITEM) { this.navigateModal(1); return; }
                if (e.key === KEYS.FAVORITE) { this.toggleFavorite(this.modalItem.id); return; }
                if (e.key === KEYS.PIN) { this.togglePin(this.modalItem.id); return; }
                return;
            }

            // Chord handling: G then B = build planner
            if (this._chordKey === KEYS.CHORD_GO) {
                this._chordKey = null;
                clearTimeout(this._chordTimer);
                if (e.key === KEYS.CHORD_BUILD) {
                    this.openBuildPlanner();
                    return;
                }
            }

            if (e.key === KEYS.CHORD_GO) {
                this._chordKey = KEYS.CHORD_GO;
                this._chordTimer = setTimeout(() => { this._chordKey = null; }, CHORD_TIMEOUT);
                return;
            }

            // Global single-key shortcuts
            if (e.key === KEYS.SEARCH) {
                e.preventDefault();
                const input = document.querySelector('.global-search input');
                if (input) {
                    if (!this.globalQuery && this.lastGlobalQuery) {
                        this.globalQuery = this.lastGlobalQuery;
                        this.globalSearch();
                    }
                    input.focus();
                    this.$nextTick(() => input.select());
                }
                return;
            }
            if (e.key === KEYS.TOGGLE_VIEW && !this.buildPlannerActive) {
                this.setViewMode(this.viewMode === 'tiles' ? 'table' : 'tiles');
                return;
            }
            if (e.key === KEYS.TOGGLE_SIDEBAR) { this.toggleSidebarCollapse(); return; }
            if (e.key === KEYS.COMPARE && this.pinnedIds.length) { this.openCompare(); return; }
            if (e.key === KEYS.HELP) { this.shortcutHelpOpen = true; return; }
            if (e.key === KEYS.FILTERS && e.shiftKey) {
                if (!this.buildPlannerActive) this.toggleFilterPanel();
                return;
            }
            if (e.key === KEYS.CLEAR_FILTERS && !this.buildPlannerActive) {
                this.clearAllFilters();
                this.filterQuery = "";
                this.filterInput = "";
                return;
            }
            if (e.key === KEYS.PREV_CATEGORY || e.key === KEYS.NEXT_CATEGORY) {
                this.navigateCategory(e.key === KEYS.PREV_CATEGORY ? -1 : 1);
                return;
            }
        });

        // 0. Backward-compat: redirect legacy query-param URLs to path-based URLs
        // Pack-dependent paths (db categories, favorites, recent) are redirected later
        // in mounted() after the pack is known. Only pack-independent paths redirect here.
        {
            const lp = new URLSearchParams(window.location.search);
            const legacyCat = lp.get("cat");
            if (legacyCat === "build-planner" || legacyCat === "version-compare") {
                const newPath = legacyCat === "build-planner" ? "/build-planner" : "/version-compare";
                lp.delete("cat");
                lp.delete("pack");
                const qs = lp.toString();
                history.replaceState(null, "", newPath + (qs ? "?" + qs : "") + window.location.hash);
            }
        }

        // 1. Load app translations (pack-independent UI strings)
        try {
            const appTrRes = await fetch("/data/app_translations.json");
            if (appTrRes.ok) this.appTranslations = await appTrRes.json();
        } catch { /* ignore */ }

        // 2. Load pack manifest
        try {
            const packRes = await fetch("/data/packs.json");
            const manifest = await packRes.json();
            this.packs = manifest.packs;
            this._defaultPackId = manifest.default;

            // Determine initial pack: path > legacy query param > localStorage > manifest default
            const parsedPath = parsePathUrl(window.location.pathname);
            const legacyUrlPack = new URLSearchParams(window.location.search).get("pack");
            const urlPack = parsedPath.pack || legacyUrlPack;
            const savedPack = localStorage.getItem("selectedPack");
            const targetId = urlPack || savedPack || manifest.default;
            this.activePack = this.packs.find((p) => p.id === targetId) || this.packs[0];

            // URL will be updated after state restoration below

            // Persist selection
            localStorage.setItem("selectedPack", this.activePack.id);

            // Update title
            document.title = `Stalker Anomaly Tools [${this.activePack.name}]`;

            // Redirect remaining legacy query-param URLs now that pack is known
            const lp2 = new URLSearchParams(window.location.search);
            const legacyCat2 = lp2.get("cat");
            const legacyPack2 = lp2.get("pack");
            if (legacyCat2 || legacyPack2) {
                const pack = this.activePack.id;
                const isFav = legacyCat2 === "favorites";
                const isRecent = legacyCat2 === "recent";
                const newPath = buildPathUrl({
                    pack,
                    cat: (isFav || isRecent) ? null : legacyCat2,
                    favorites: isFav,
                    recent: isRecent,
                });
                lp2.delete("cat");
                lp2.delete("pack");
                const qs = lp2.toString();
                history.replaceState(null, "", newPath + (qs ? "?" + qs : "") + window.location.hash);
            }
        } catch (e) {
            console.error("Failed to load packs manifest:", e);
        }

        // 2. Migrate unscoped pinnedIds on first load
        try {
            const unscopedPins = localStorage.getItem("pinnedIds");
            if (unscopedPins && this.activePack) {
                const scopedKey = this.getPinStorageKey();
                if (!localStorage.getItem(scopedKey)) {
                    localStorage.setItem(scopedKey, unscopedPins);
                }
                localStorage.removeItem("pinnedIds");
            }
        } catch (e) { /* ignore */ }

        // 3. Restore locale before loading data so first render uses correct language
        //    URL param takes priority over localStorage so shared links preserve language
        try {
            const urlLang = new URLSearchParams(window.location.search).get("lang");
            const locale = urlLang || localStorage.getItem("locale");
            if (LOCALES.some(l => l.id === locale)) this.locale = locale;
        } catch (e) { /* ignore */ }

        // 4. Load pack data (save initial state for later restoration)
        const initialSearch = window.location.search;
        const initialHash = window.location.hash;
        await this.loadPackData();

        // 5. Restore pinned items, favorites, and recent (scoped)
        this.loadScopedPins();
        this.loadFavorites();
        this.loadRecent();

        // 5a. Restore sidebar collapsed state
        try {
            this.sidebarCollapsed = !!localStorage.getItem("sidebarCollapsed");
            const cg = localStorage.getItem("collapsedGroups");
            if (cg) this.collapsedGroups = JSON.parse(cg);
        } catch (e) { /* ignore */ }

        // 5b. Restore view mode from localStorage
        try {
            const savedView = localStorage.getItem("viewMode");
            if (savedView === "table" || savedView === "tiles") this.viewMode = savedView;
        } catch (e) { /* ignore */ }

        // 6. Restore hideNoDrop from localStorage
        try {
            const savedHide = localStorage.getItem("hideNoDrop");
            if (savedHide !== null) this.hideNoDrop = JSON.parse(savedHide);
        } catch (e) { /* ignore */ }

        // 6a. Restore hideUnusedAmmo from localStorage
        try {
            const savedHideAmmo = localStorage.getItem("hideUnusedAmmo");
            if (savedHideAmmo !== null) this.hideUnusedAmmo = JSON.parse(savedHideAmmo);
        } catch (e) { /* ignore */ }

        // 6b. Restore URL state (sort, filters, view, etc.)
        this._restoringUrl = true;
        this.restoreUrlState(initialSearch);
        this._restoringUrl = false;
        this.pushUrlState();

        // 6c. Restore build planner from shared hash or legacy URL params
        const shareHash = initialHash.startsWith("#" + BUILD_HASH_PREFIX) ? initialHash.slice(1 + BUILD_HASH_PREFIX.length) : null;
        if (shareHash) {
            await this.openBuildPlanner();
            const data = await this.loadSharedBuild(shareHash);
            if (data) {
                this.restoreBuildFromIds(data);
                this.saveBuildToStorage();
            }
        } else if (this._pendingBuildRestore) {
            // Legacy URL param support
            const params = this._pendingBuildRestore;
            this._pendingBuildRestore = null;
            await this.openBuildPlanner();
            this.restoreBuildFromUrl(params);
        }

        // 7. Handle hash-based item/build navigation
        if (!shareHash && initialHash.length > 1 && !initialHash.startsWith("#" + BUILD_HASH_PREFIX)) {
            this.openItem(initialHash.slice(1));
        }
        window.addEventListener("hashchange", async () => {
            const hash = window.location.hash.slice(1);
            if (hash.startsWith(BUILD_HASH_PREFIX)) {
                const data = await this.loadSharedBuild(hash.slice(BUILD_HASH_PREFIX.length));
                if (data) {
                    if (!this.buildPlannerActive) this.openBuildPlanner();
                    this.restoreBuildFromIds(data);
                    this.saveBuildToStorage();
                }
            } else if (hash) {
                this.openItem(hash);
            } else {
                this.closeModal();
            }
        });

        // 7b. Handle popstate (back/forward) navigation
        window.addEventListener("popstate", async () => {
            const parsed = parsePathUrl(window.location.pathname);
            this._restoringUrl = true;
            // Handle pack switch if path includes a pack
            if (parsed.pack && this.activePack?.id !== parsed.pack) {
                const newPack = this.packs.find(p => p.id === parsed.pack);
                if (newPack) {
                    this.activePack = newPack;
                    localStorage.setItem("selectedPack", newPack.id);
                    document.title = `Stalker Anomaly Tools [${newPack.name}]`;
                    await this.loadPackData();
                }
            }
            if (parsed.buildPlanner) {
                if (!this.buildPlannerActive) await this.openBuildPlanner();
            } else if (parsed.favorites) {
                this.resetViewState();
                this.favoritesViewActive = true;
            } else if (parsed.recent) {
                this.resetViewState();
                this.recentViewActive = true;
            } else if (parsed.versionCompare) {
                this.resetViewState();
                this.versionCompareActive = true;
                if (this.crossPackId) this.loadVersionCompareData();
            } else if (parsed.cat) {
                const match = this.categories.find(c => categorySlug(c) === parsed.cat) || [...VIRTUAL_CATEGORIES].find(c => categorySlug(c) === parsed.cat);
                if (match) await this.selectCategory(match);
            } else {
                // Root path — select default category
                if (this.groupedCategories.length > 0) {
                    await this.selectCategory(this.groupedCategories[0].categories[0]);
                }
            }
            // Restore filter state from query params
            this.restoreUrlState(window.location.search, window.location.pathname);
            this._restoringUrl = false;
        });

        // Reposition callout on resize/scroll
        this._repositionCallout = () => { if (this.calloutActive) this.positionCallout(); };
        window.addEventListener("resize", this._repositionCallout);
        window.addEventListener("scroll", this._repositionCallout, true);

        // 8. Check for unseen release notes & init What's New
        try {
            const rnRes = await fetch("/data/release-notes.json", { cache: "no-cache" });
            const rnData = await rnRes.json();
            if (rnData.length) {
                const hash = await this.releaseNotesHash(rnData);
                const seen = localStorage.getItem("releaseNotesHash") || localStorage.getItem("lastSeenReleaseDate");
                if (!seen || seen !== hash) this.hasUnseenReleaseNotes = true;
                this.initWhatsNew(rnData, hash);
            }
        } catch (e) { /* ignore */ }
    },
};

// Tooltip directive (Floating UI)
export const tooltipDirective = {
    mounted(el, binding) {
        const tip = document.createElement("div");
        tip.className = "tooltip";
        const content = document.createElement("div");
        content.className = "tooltip-content";
        tip.appendChild(content);

        const arrow = document.createElement("div");
        arrow.className = "tooltip-arrow";
        tip.appendChild(arrow);
        document.body.appendChild(tip);

        const setContent = (value) => {
            const wasVisible = tip.classList.contains("visible");
            tip.className = "tooltip";
            if (wasVisible) tip.classList.add("visible");
            if (value && typeof value === "object") {
                if (value.className) {
                    for (const cls of String(value.className).split(/\s+/)) {
                        if (cls) tip.classList.add(cls);
                    }
                }
                if (value.html != null) {
                    content.innerHTML = String(value.html);
                } else {
                    content.textContent = value.text == null ? "" : String(value.text);
                }
                return;
            }
            content.textContent = value == null ? "" : String(value);
        };
        setContent(binding.value);

        function update() {
            FloatingUIDOM.computePosition(el, tip, {
                placement: "bottom",
                middleware: [
                    FloatingUIDOM.offset(8),
                    FloatingUIDOM.flip(),
                    FloatingUIDOM.shift({ padding: 8 }),
                    FloatingUIDOM.arrow({ element: arrow }),
                ],
            }).then(({ x, y, placement, middlewareData }) => {
                Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
                const side = { top: "bottom", right: "left", bottom: "top", left: "right" }[placement.split("-")[0]];
                if (middlewareData.arrow) {
                    const { x: ax, y: ay } = middlewareData.arrow;
                    Object.assign(arrow.style, {
                        left: ax != null ? `${ax}px` : "",
                        top: ay != null ? `${ay}px` : "",
                        [side]: "-4px",
                    });
                }
            });
        }

        let cleanup = null;

        el._tooltipShow = () => {
            if (!content.textContent && !content.innerHTML.trim()) return;
            tip.classList.add("visible");
            cleanup = FloatingUIDOM.autoUpdate(el, tip, update);
        };
        el._tooltipHide = () => {
            tip.classList.remove("visible");
            if (cleanup) { cleanup(); cleanup = null; }
        };

        el.addEventListener("mouseenter", el._tooltipShow);
        el.addEventListener("mouseleave", el._tooltipHide);
        el.addEventListener("focus", el._tooltipShow);
        el.addEventListener("blur", el._tooltipHide);

        el._tooltip = tip;
        el._tooltipSetContent = setContent;
    },
    updated(el, binding) {
        if (el._tooltip && el._tooltipSetContent) el._tooltipSetContent(binding.value);
    },
    unmounted(el) {
        el.removeEventListener("mouseenter", el._tooltipShow);
        el.removeEventListener("mouseleave", el._tooltipHide);
        el.removeEventListener("focus", el._tooltipShow);
        el.removeEventListener("blur", el._tooltipHide);
        el._tooltipHide();
        el._tooltip.remove();
    },
};

// Click-outside directive
export const clickOutsideDirective = {
    mounted(el, binding) {
        el._clickOutside = (e) => {
            if (!el.contains(e.target)) {
                binding.value();
            }
        };
        document.addEventListener("click", el._clickOutside);
    },
    unmounted(el) {
        document.removeEventListener("click", el._clickOutside);
    },
};
