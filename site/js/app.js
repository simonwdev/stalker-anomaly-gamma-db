const EFFECT_FIELDS = new Set([
    "st_prop_restore_health", "st_prop_restore_bleeding", "st_data_export_restore_radiation", "ui_inv_outfit_power_restore",
    "st_data_export_eat_health_change", "st_itm_desc_eat_sleepiness", "st_itm_desc_eat_thirst", "st_data_export_eat_alcohol", "ui_inv_satiety",
    "ui_inv_outfit_fire_wound_protection", "ui_inv_outfit_wound_protection", "ui_inv_outfit_burn_protection", "ui_inv_outfit_shock_protection", "ui_inv_outfit_chemical_burn_protection",
    "ui_inv_outfit_radiation_protection", "ui_inv_outfit_telepatic_protection", "ui_inv_outfit_strike_protection", "ui_inv_outfit_explosion_protection",
]);


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
const SKIP_KEYS = new Set(["id", "pda_encyclopedia_name", "hasNpcWeaponDrop", "hasStashDrop", "hasDisassemble"]);
const MAX_PINS = 5;
const LOWER_IS_BETTER = new Set(["st_data_export_weapon_degradation"]);
const HIGHER_IS_WORSE = new Set(["st_prop_weight", "st_upgr_cost"]);
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
const TILE_HIDE = new Set(["st_upgr_cost", "pda_encyclopedia_name", "name", "pda_encyclopedia_tier", "ui_st_rank", "Type", "st_data_export_has_perk", "st_data_export_is_junk", "st_data_export_can_be_crafted", "ui_mcm_menu_exo", "st_data_export_can_be_cooked", "st_data_export_used_in_cooking", "st_data_export_used_in_crafting", "st_data_export_cuts_thick_skin", ...HEAL_FIELDS]);

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


const SINGULAR_TYPE = { Pistols: "app_type_pistol", SMGs: "app_type_smg", Shotguns: "app_type_shotgun", Rifles: "app_type_rifle", Snipers: "app_type_sniper", Launchers: "app_type_launcher", Melee: "app_cat_melee" };
const SINGULAR_CATEGORY = { ...SINGULAR_TYPE, Outfits: "app_type_outfit", Helmets: "app_type_helmet", "Belt Attachments": "app_type_belt_attachment", Explosives: "app_type_explosive", Artefacts: "app_type_artefact", Materials: "app_type_material", "Mutant Parts": "app_type_mutant_part" };

const CATEGORY_KEYS = {
    "Favorites": "app_cat_favorites", "All Weapons": "app_cat_all_weapons",
    "Pistols": "app_cat_pistols", "SMGs": "app_cat_smgs", "Shotguns": "app_cat_shotguns",
    "Rifles": "app_cat_rifles", "Snipers": "app_cat_snipers", "Launchers": "app_cat_launchers",
    "Melee": "app_cat_melee", "Ammo": "app_cat_ammo", "Explosives": "app_cat_explosives",
    "Outfits": "app_cat_outfits", "Helmets": "app_cat_helmets",
    "Belt Attachments": "app_cat_belt_attachments", "Outfit Exchange": "app_cat_outfit_exchange",
    "Food": "app_cat_food", "Medicine": "app_cat_medicine", "Artefacts": "app_cat_artefacts",
    "Crafting Trees": "app_cat_crafting_trees", "Materials": "app_cat_materials",
    "Mutant Parts": "app_cat_mutant_parts", "Recipes": "app_cat_recipes",
};
const WEAPON_CATEGORIES = ["Pistols", "SMGs", "Shotguns", "Rifles", "Snipers", "Launchers", "Melee"];
const VIRTUAL_CATEGORIES = new Set(["All Weapons", "Crafting Trees"]);

const CATEGORY_GROUPS = [
    { name: "app_group_weapons", categories: ["All Weapons", ...WEAPON_CATEGORIES] },
    { name: "app_group_ammo_explosives", categories: ["Ammo", "Explosives"] },
    { name: "app_group_equipment", categories: ["Outfits", "Helmets", "Belt Attachments", "Outfit Exchange"] },
    { name: "app_group_consumables", categories: ["Food", "Medicine"] },
    { name: "app_group_items", categories: ["Artefacts", "Crafting Trees", "Materials", "Mutant Parts"] },
];

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

function buildDropFactions(drops) {
    if (!drops) return [];
    return Object.entries(drops).map(([name, ranks]) => ({
        name,
        ranks,
        icon: FACTION_ICONS[name] || null,
    })).sort((a, b) => a.name.localeCompare(b.name));
}

function categorySlug(category) {
    return category.toLowerCase().replace(/ /g, "-");
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

const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            // Pack state
            packs: [],
            activePack: null,
            packLoading: false,

            // Localisation
            locale: "en",
            translations: null,

            index: [],
            categories: [],
            groupedCategories: [],
            activeCategory: null,
            categoryItems: {},
            categoryHeaders: {},
            categoryFuse: {},
            globalQuery: "",
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

            // Settings menu
            settingsOpen: false,
            sidebarOpen: false,
            hideNoDrop: true,
            hideUnusedAmmo: true,

            // Filter & Sort
            activeFilters: {},
            filterPanelOpen: false,
            downloadMenuOpen: false,
            sortMenuOpen: false,

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
        };
    },

    computed: {
        dataBasePath() {
            if (!this.activePack) return "data";
            return `data/${this.activePack.id}`;
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
            counts["All Weapons"] = allWeapons;
            counts["Crafting Trees"] = counts["Recipes"] || 0;
            counts["Favorites"] = this.favoriteIds.length;
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

        tileFields() {
            if (!this.activeCategory) return [];
            return this.displayHeaders.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total "));
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

        modalStatRows() {
            const isWeapon = WEAPON_CATEGORIES.includes(this.modalCategory);
            return buildStatRows(this.modalItem, this.modalHeaders).filter(r => !HEAL_FIELDS.has(r.key) && !MODAL_BADGE_KEYS.has(r.key) && !(isWeapon && r.key === "st_upgr_cost"));
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
            return this.activeCategory === "Outfit Exchange";
        },

        isMaterialsCategory() {
            return this.activeCategory === "Materials";
        },

        isCraftingTrees() {
            return this.activeCategory === "Crafting Trees";
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
            return this.activeCategory === "All Weapons";
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
                if (NAME_TAG_COLS.has(h)) return false;
                if (HEAL_FIELDS.has(h)) return false;
                if (items.length > 0) {
                    const first = items[0][h] ?? "";
                    if (items.every((item) => (item[h] ?? "") === first)) return false;
                }
                return true;
            });

            const isWeapon = WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === "All Weapons";
            if (raw.includes("st_upgr_cost") && !isWeapon) filtered.push("st_upgr_cost");

            // Ensure Faction appears right after Name
            const facIdx = filtered.indexOf("ui_st_community");
            const nameIdx = filtered.indexOf("pda_encyclopedia_name");
            if (facIdx >= 0 && nameIdx >= 0 && facIdx < nameIdx) {
                filtered.splice(facIdx, 1);
                filtered.splice(nameIdx, 0, "ui_st_community");
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
                    const step = maxDecimals > 0 ? parseFloat((1 / Math.pow(10, maxDecimals)).toFixed(maxDecimals)) : 1;
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
                if (def.type === "flag" && val === true) {
                    chips.push({ key, label: def.label, value: null, type: "flag" });
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
                const av = isName ? (this.tName(a) || "") : (a[col] ?? "");
                const bv = isName ? (this.tName(b) || "") : (b[col] ?? "");
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
            for (const h of headers) {
                if (RANGE_EXCLUDE.has(h) || NO_HIGHLIGHT.has(h)) continue;
                if (h.includes("/")) continue;
                let min = Infinity, max = -Infinity;
                for (const item of items) {
                    const s = String(item[h] ?? "");
                    const n = parseFloat(s.replace(/%$/, ""));
                    if (isNaN(n)) continue;
                    if (n > max) max = n;
                    if (n < min) min = n;
                }
                if (max !== -Infinity) ranges[h] = { max, min };
            }
            return ranges;
        },
    },

    methods: {
        t(key) {
            if (!this.translations || !key) return key;
            const k = key.toLowerCase();
            return this.translations[this.locale]?.[k] ?? this.translations.en?.[k] ?? key;
        },

        tCat(name) {
            return this.t(CATEGORY_KEYS[name] || name);
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

        async fetchJsonCached(cacheKey, filename) {
            if (this[cacheKey] !== null) return this[cacheKey];
            try {
                const res = await fetch(`${this.dataBasePath}/${filename}`);
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

        async loadItemById(id) {
            const indexRes = await fetch(`${this.dataBasePath}/index.json`);
            const index = await indexRes.json();
            const entry = index.find((i) => i.id === id);
            if (!entry) return null;

            const slug = categorySlug(entry.category);
            const catRes = await fetch(`${this.dataBasePath}/${slug}.json`);
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
                const [indexRes, catRes, trRes, dlRes] = await Promise.all([
                    fetch(`${this.dataBasePath}/index.json`),
                    fetch(`${this.dataBasePath}/categories.json`),
                    fetch(`${this.dataBasePath}/translations.json`),
                    fetch(`${this.dataBasePath}/display-labels.json`),
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
                        categories: g.categories.filter((c) => catSet.has(c) || VIRTUAL_CATEGORIES.has(c)),
                    }))
                    .filter((g) => g.categories.length > 0);
                this.rebuildGlobalFuse();
                if (this.groupedCategories.length > 0) {
                    const urlCat = new URLSearchParams(window.location.search).get("cat");
                    if (urlCat === "favorites") {
                        this.favoritesViewActive = true;
                        this.activeCategory = null;
                        this.sortCol = "pda_encyclopedia_name";
                    } else if (urlCat === "recent") {
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

            // Save selection
            localStorage.setItem("selectedPack", this.activePack.id);

            // Update URL (clears stale filter/sort params)
            this.pushUrlState();

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
                });
            }

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
            this.filterPanelOpen = false;
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
                }
            }
            this.pushUrlState();

            if (cat === "All Weapons") {
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
                        return fetch(`${this.dataBasePath}/${s}.json`).then(r => r.json());
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

            if (cat === "Outfit Exchange") {
                if (!this.outfitExchange) {
                    this.startContentLoading();
                    try {
                        const res = await fetch(`${this.dataBasePath}/outfit-exchange.json`);
                        this.outfitExchange = res.ok ? await res.json() : null;
                    } catch (e) {
                        console.error("Failed to load outfit exchange:", e);
                        this.outfitExchange = null;
                    }
                    await this.stopContentLoading();
                }
                return;
            }

            if (cat === "Crafting Trees") {
                if (this.craftingTrees.length === 0) {
                    this.startContentLoading();
                    try {
                        const recipesData = await this.fetchRecipes();
                        this.buildCraftingTreeData(recipesData);
                    } catch (e) {
                        console.error("Failed to load crafting trees:", e);
                    }
                    await this.stopContentLoading();
                }
                this.craftingTreeExpandAll = false;
                this.craftingTreeExpanded = new Set();
                return;
            }

            const slug = categorySlug(cat);
            if (this.categoryItems[slug]) {
                if (slug === 'ammo') this.fetchAmmoWeapons();
                return;
            }

            this.startContentLoading();
            try {
                const res = await fetch(`${this.dataBasePath}/${slug}.json`);
                const data = await res.json();
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
                    const res = await fetch(`${this.dataBasePath}/${slug}.json`);
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
        },

        async copyItemId(id) {
            try {
                await navigator.clipboard.writeText(id);
                this.copyIdFeedback = true;
                setTimeout(() => { this.copyIdFeedback = false; }, 1500);
            } catch {
                // fallback
                const ta = document.createElement("textarea");
                ta.value = id;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                this.copyIdFeedback = true;
                setTimeout(() => { this.copyIdFeedback = false; }, 1500);
            }
        },

        async copyModalLink() {
            const url = window.location.href;
            try {
                await navigator.clipboard.writeText(url);
                this.copyModalLinkFeedback = true;
                setTimeout(() => { this.copyModalLinkFeedback = false; }, 1500);
            } catch {
                const ta = document.createElement("textarea");
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                this.copyModalLinkFeedback = true;
                setTimeout(() => { this.copyModalLinkFeedback = false; }, 1500);
            }
        },

        closeModal() {
            this.modalOpen = false;
            this.modalItem = null;
            document.body.style.overflow = "";
            if (window.location.hash) {
                history.pushState(null, "", window.location.pathname + window.location.search);
            }
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

        selectFavorites() {
            this.favoritesViewActive = true;
            this.recentViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = null;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.activeFilters = {};
            this.filterPanelOpen = false;
            this.sidebarOpen = false;
            this.pushUrlState();
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
            this.recentViewActive = true;
            this.favoritesViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = null;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.activeFilters = {};
            this.filterPanelOpen = false;
            this.sidebarOpen = false;
            this.pushUrlState();
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
            document.body.style.overflow = this.modalOpen ? "hidden" : "";
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
            this.settingsOpen = false;
        },
        closeSortMenu() {
            this.sortMenuOpen = false;
        },
        pickSort(col) {
            this.sortCol = col;
            this.sortMenuOpen = false;
            this.pushUrlState();
        },

        closeFilterPanel() {
            this.filterPanelOpen = false;
            if (this._filterPanelCleanup) {
                this._filterPanelCleanup();
                this._filterPanelCleanup = null;
            }
            // Clear Floating UI inline styles and fullscreen class
            const panel = document.querySelector('.filter-panel');
            if (panel) {
                panel.style.left = ''; panel.style.top = '';
                panel.classList.remove('filter-panel-fullscreen');
            }
            document.body.classList.remove('filter-fullscreen-active');
        },

        toggleFilterPanel() {
            if (this.filterPanelOpen) {
                this.closeFilterPanel();
                return;
            }
            this.filterPanelOpen = true;
            this.$nextTick(() => {
                const btn = document.querySelector('.filter-btn');
                const panel = document.querySelector('.filter-panel');
                if (!btn || !panel) return;
                // Use full-screen overlay on mobile or when panel won't fit as dropdown
                const isMobile = window.matchMedia('(max-width: 768px)').matches;
                const contentWidth = document.querySelector('.filter-bar')?.offsetWidth || window.innerWidth;
                if (isMobile || contentWidth < 600) {
                    panel.classList.add('filter-panel-fullscreen');
                    document.body.classList.add('filter-fullscreen-active');
                    return;
                }
                panel.classList.remove('filter-panel-fullscreen');
                document.body.classList.remove('filter-fullscreen-active');
                this._filterPanelCleanup = FloatingUIDOM.autoUpdate(btn, panel, () => {
                    FloatingUIDOM.computePosition(btn, panel, {
                        strategy: 'fixed',
                        placement: 'bottom-start',
                        middleware: [
                            FloatingUIDOM.offset(6),
                            FloatingUIDOM.flip(),
                            FloatingUIDOM.shift({
                                padding: 8,
                                crossAxis: false,
                                boundary: {
                                    x: 0, y: 0,
                                    width: window.innerWidth,
                                    height: window.innerHeight,
                                },
                            }),
                        ],
                    }).then(({ x, y }) => {
                        Object.assign(panel.style, { position: 'fixed', left: `${x}px`, top: `${y}px` });
                    });
                });
            });
        },

        closeDownloadMenu() {
            this.downloadMenuOpen = false;
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
            this.downloadMenuOpen = false;
            const cols = this.buildExportColumns();
            const rows = this.sortedItems;

            const getValue = (item, col) => {
                if (col.key === 'pda_encyclopedia_name' || col.key === 'name') {
                    return this.tName(item);
                }
                const v = item[col.key];
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
                    } else if (def.type === "has-effect" && Array.isArray(val) && val.length > 0) {
                        for (const field of val) {
                            if (!isNonZero(item[field])) return false;
                        }
                    } else if (Array.isArray(val) && val.length > 0) {
                        const itemVal = item[key];
                        if (key === "ui_ammo_types") {
                            const itemCals = String(itemVal || "").split(";").map(s => s.trim()).filter(Boolean);
                            if (!val.some(v => itemCals.includes(v))) return false;
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

        toggleFlagFilter(key) {
            if (this.activeFilters[key] === true) {
                delete this.activeFilters[key];
            } else {
                this.activeFilters[key] = true;
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
            const next = Math.round(cur) + delta;
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
            return FACTION_ICONS[name] || FACTION_ICONS[name?.toLowerCase()] || null;
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

        headerLabel(h) {
            if (!h) return "";
            if (h === "_heal") return this.t("app_heal_heals");
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
            const ranges = {};
            for (const h of headers) {
                if (RANGE_EXCLUDE.has(h) || NO_HIGHLIGHT.has(h)) continue;
                if (h.includes("/")) continue;
                let min = Infinity, max = -Infinity;
                for (const item of items) {
                    const s = String(item[h] ?? "");
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

        formatValue(h, val, tableMode) {
            if (val === undefined || val === null || val === "" || val === "--") return "--";
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
            if (unit && !isPct && n !== 0) return `${val} ${unit}`;
            return val;
        },

        singularType(val) {
            return SINGULAR_TYPE[val] || val;
        },

        singularCategory(val) {
            return SINGULAR_CATEGORY[val] || val;
        },

        caliberName(val) {
            if (!val) return "--";
            return val.split(";").map(s => {
                const cal = s.trim();
                const entry = this.calibers[cal];
                return entry ? entry.name : cal;
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

        pushUrlState() {
            const url = new URL(window.location);
            if (this.activePack) url.searchParams.set("pack", this.activePack.id);
            if (this.favoritesViewActive) {
                url.searchParams.set("cat", "favorites");
                url.searchParams.delete("favonly");
            } else if (this.recentViewActive) {
                url.searchParams.set("cat", "recent");
                url.searchParams.delete("favonly");
            } else if (this.activeCategory) {
                url.searchParams.set("cat", categorySlug(this.activeCategory));
                if (this.showFavoritesOnly) {
                    url.searchParams.set("favonly", "1");
                } else {
                    url.searchParams.delete("favonly");
                }
            } else {
                url.searchParams.delete("cat");
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
                } else if (Array.isArray(val) && val.length === 2 && (typeof val[0] === "number" || val[0] === null)) {
                    if (val[0] !== null || val[1] !== null) {
                        url.searchParams.append("f", key + ":" + (val[0] ?? "") + "~" + (val[1] ?? ""));
                    }
                } else if (Array.isArray(val) && val.length > 0) {
                    url.searchParams.append("f", key + ":" + val.join(","));
                }
            }
            if (this.exchangeFactionFilter) {
                url.searchParams.set("faction", this.exchangeFactionFilter);
            } else {
                url.searchParams.delete("faction");
            }
            if (this.locale) {
                url.searchParams.set("lang", this.locale);
            }
            history.replaceState(null, "", url);

            // Persist filter state for the active category
            if (this.activeCategory && this.activePack) {
                saveCategoryFilters(this.activePack.id, categorySlug(this.activeCategory), {
                    activeFilters: JSON.parse(JSON.stringify(this.activeFilters)),
                    filterQuery: this.filterQuery,
                    sortCol: this.sortCol,
                    sortAsc: this.sortAsc,
                    exchangeFactionFilter: this.exchangeFactionFilter,
                });
            }
        },

        restoreUrlState(search) {
            const params = new URLSearchParams(search || window.location.search);
            if (params.get("cat") === "favorites") {
                this.favoritesViewActive = true;
                this.activeCategory = null;
            } else if (params.get("cat") === "recent") {
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
                    this.activeFilters[f] = true;
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
            const faction = params.get("faction");
            if (faction) this.exchangeFactionFilter = faction;
        },

        async copyLink() {
            const url = window.location.href;
            try {
                await navigator.clipboard.writeText(url);
                this.copyLinkFeedback = true;
                setTimeout(() => { this.copyLinkFeedback = false; }, 1500);
            } catch {
                const ta = document.createElement("textarea");
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                this.copyLinkFeedback = true;
                setTimeout(() => { this.copyLinkFeedback = false; }, 1500);
            }
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

        sortIcon(col) {
            if (this.sortCol !== col) return "";
            return this.sortAsc ? " \u25B2" : " \u25BC";
        },

        handleEscape() {
            if (this.sortMenuOpen) {
                this.sortMenuOpen = false;
            } else if (this.downloadMenuOpen) {
                this.downloadMenuOpen = false;
            } else if (this.sidebarOpen) {
                this.sidebarOpen = false;
            } else if (this.filterPanelOpen) {
                this.filterPanelOpen = false;
            } else if (this.compareOpen) {
                this.closeCompare();
            } else if (this.modalOpen) {
                this.closeModal();
            }
        },

        toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
        closeSidebar() { this.sidebarOpen = false; },

        clearGlobalQuery() {
            this.globalQuery = "";
        },
    },

    watch: {
        filterInput() {
            this.debouncedFilterInput();
        },
        filterQuery() {
            if (!this._restoringUrl) this.debouncedPushUrl();
        },
        exchangeFactionFilter() {
            if (!this._restoringUrl) this.pushUrlState();
        },
    },

    created() {
        this.debouncedGlobalSearch = debounce(() => this.globalSearch(), 200);
        this.debouncedPushUrl = debounce(() => this.pushUrlState(), 300);
        this.debouncedFilterInput = debounce(() => { this.filterQuery = this.filterInput; }, 200);
    },

    updated() {
        this.$nextTick(() => lucide.createIcons());
    },

    async mounted() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.handleEscape();
            if (e.key === 'ArrowLeft') this.navigateModal(-1);
            if (e.key === 'ArrowRight') this.navigateModal(1);
        });

        // 1. Load pack manifest
        try {
            const packRes = await fetch("data/packs.json");
            const manifest = await packRes.json();
            this.packs = manifest.packs;

            // Determine initial pack: URL param > localStorage > manifest default
            const urlParams = new URLSearchParams(window.location.search);
            const urlPack = urlParams.get("pack");
            const savedPack = localStorage.getItem("selectedPack");
            const targetId = urlPack || savedPack || manifest.default;
            this.activePack = this.packs.find((p) => p.id === targetId) || this.packs[0];

            // URL will be updated after state restoration below

            // Persist selection
            localStorage.setItem("selectedPack", this.activePack.id);

            // Update title
            document.title = `Stalker Anomaly Tools [${this.activePack.name}]`;
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
            if (locale === "en" || locale === "ru") this.locale = locale;
        } catch (e) { /* ignore */ }

        // 4. Load pack data (save initial search for later restoration)
        const initialSearch = window.location.search;
        await this.loadPackData();

        // 5. Restore pinned items, favorites, and recent (scoped)
        this.loadScopedPins();
        this.loadFavorites();
        this.loadRecent();

        // 5a. Restore view mode from localStorage
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

        // 7. Handle hash-based item navigation
        if (window.location.hash.length > 1) {
            this.openItem(window.location.hash.slice(1));
        }
        window.addEventListener("hashchange", () => {
            const id = window.location.hash.slice(1);
            if (id) {
                this.openItem(id);
            } else {
                this.closeModal();
            }
        });

        this.$nextTick(() => lucide.createIcons());
    },
});

// Tooltip directive (Floating UI)
app.directive("tooltip", {
    mounted(el, binding) {
        const tip = document.createElement("div");
        tip.className = "tooltip";
        tip.textContent = binding.value;

        const arrow = document.createElement("div");
        arrow.className = "tooltip-arrow";
        tip.appendChild(arrow);
        document.body.appendChild(tip);

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
    },
    updated(el, binding) {
        if (el._tooltip) el._tooltip.firstChild.textContent = binding.value;
    },
    unmounted(el) {
        el.removeEventListener("mouseenter", el._tooltipShow);
        el.removeEventListener("mouseleave", el._tooltipHide);
        el.removeEventListener("focus", el._tooltipShow);
        el.removeEventListener("blur", el._tooltipHide);
        el._tooltipHide();
        el._tooltip.remove();
    },
});

// Click-outside directive
app.directive("click-outside", {
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
});

app.mount("#app");
