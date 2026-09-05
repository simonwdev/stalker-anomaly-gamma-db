import '../src/globals.js';
import { markRaw } from 'vue';
import { attachHoverPosition, prefersTouchHover } from '../src/hover-popover.js';
import { parseCondition } from './trader-conditions.js';
import {
    EFFECT_FIELDS, FILTER_DEFS, NAME_TAG_COLS, BADGE_COLS, MODAL_BADGE_KEYS,
    SKIP_KEYS, MAX_PINS, BUILD_HASH_PREFIX,
    LOWER_IS_BETTER, HIGHER_IS_WORSE, NO_HIGHLIGHT, BIPOLAR, POSITIVE_IS_GOOD,
    HEAL_GROUPS, HEAL_FIELDS, RANGE_EXCLUDE, TILE_HIDE, KIT_HIDE_FIELDS, UNITS,
    PROTECTION_FIELDS, RESTORATION_FIELDS, BASE_RESIST_CAP, CAP_FIELD_MAP,
    ZONE_SPLIT_FIELDS, PROTECTION_HARD_CAP, BASE_PREMITIGATION,
    CAT, BUILD_SLOT_CATEGORIES, isBackpack, MAX_SAVED_BUILDS,
    WEAPON_STAT_FIELDS, AMMO_MULTIPLIER_FIELDS, AMMO_ONLY_FIELDS, GRENADE_STAT_FIELDS,
    PACKS_HIDE_GUN_DAMAGE_RANGE, HIDDEN_GUN_DAMAGE_RANGE_FIELDS, GLOBAL_HIDDEN_WEAPON_STAT_FIELDS,
    PRIMARY_WEAPON_SLUGS, SIDEARM_SLUGS, GRENADE_SLUG, SLOT_COLORS,
    LOCALES, CHART_COLORS,
    SINGULAR_TYPE, SINGULAR_CATEGORY, CATEGORY_KEYS,
    WEAPON_CATEGORIES, WEAPON_CATEGORY_SLUGS, VIRTUAL_CATEGORIES, CRAFTING_SUBCATEGORIES, CATEGORY_GROUPS,
    KEYS, CHORD_TIMEOUT, matchesKey,
    FACTION_ICONS, FACTION_COLORS, FACTION_LIST,
} from './constants.js';
import {
    malfunctionChance, ballisticRating, isNonZero, buildStatRows, buildDropFactions,
    categorySlug, buildPathUrl, parsePathUrl,
    saveCategoryFilters, loadCategoryFilters, debounce,
} from './utils.js';

export const appDefinition = {
    data() {
        return {
            // Pack state
            packs: [],
            activePack: null,
            packLoading: false,
            globalHiddenFields: [],

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
            globalCraftingResults: [],
            filterQuery: "",
            filterInput: "",
            fuse: null,
            loading: true,
            showContentSpinner: false,
            _spinnerTimer: null,
            _spinnerShownAt: null,
            sortCol: "pda_encyclopedia_name",
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
            exchangeFactionFilter: null,   // faction you trade WITH
            exchangeSourceFilter: null,    // faction the outfit you hand in belongs to
            exchangeDirection: "give",     // "give" = I have an outfit, "want" = I want an outfit
            exchangeView: "cards",         // "cards" | "matrix"
            exchangeSort: "name",          // "name" | "count" | "gain"
            toolkitRates: null,
            toolkitSortCol: null,
            toolkitSortAsc: false,

            // Caches
            calibersCache: null,
            dropsCache: null,
            itemDropsCache: null,
            stashChanceCache: null,
            soldByCache: null,
            tradersMetaCache: null,
            recipesCache: null,
            craftRecipesCache: null,
            disassembleCache: null,
            itemPartsCache: null,
            itemPartDefsCache: null,
            ammoWeaponsCache: null,
            weaponAddonsCache: null,
            weaponAddonStatusCache: null,
            weaponMagazinesCache: null,
            kitWeaponsCache: null,
            mutantProfilesCache: null,
            npcArmorProfilesCache: null,
            gboConstantsCache: null,
            pbaConstantsCache: null,
            plateMitigationCache: null,
            ballisticRangesCache: null,
            upgradesCache: null,

            // Crafting
            craftRecipes: null,
            craftingCategory: "all",
            craftingGraphView: (() => { try { const v = localStorage.getItem("craftingTreesView"); return v === null ? true : v === "tree"; } catch { return true; } })(),
            craftingTrees: [],
            craftingTreeExpanded: new Set(),
            craftingTreeExpandAll: false,
            _craftingTreeViewExpandAll: true,
            highlightedCraftingId: null,

            sidebarOpen: false,
            sidebarCollapsed: false,
            collapsedGroups: {},
            hideNoDrop: true,
            hideTacticalKit: false,
            hideUnusedAmmo: true,
            showTileIcons: true,
            // The Weapon Mechanics guide flags Recoil Control and Handling as meaningless
            // stat-card values; hidden by default, opt-in to show. Persisted.
            showUnreliableStats: (() => { try { return localStorage.getItem("showUnreliableStats") === "1"; } catch { return false; } })(),
            // Upgrade tree stat display: true = Engine (our computed values), false =
            // In-game (the game's authored upgrade-screen values). Defaults to Engine.
            showEngineUpgradeStats: (() => { try { return localStorage.getItem("showEngineUpgradeStats") !== "0"; } catch { return true; } })(),
            // Opt-in: the Magazines mod isn't universal, so its category is hidden
            // until the user enables it. Persisted; default off.
            showMagazines: (() => { try { return localStorage.getItem("showMagazines") === "1"; } catch { return false; } })(),
            // Opt-in: swap the starting-loadouts screen to an optional loadout mod's
            // variant (e.g. "Drunk's Alternative Loadouts and Companions"). Holds the
            // mod id, or "" for the base game. Persisted; migrates the old boolean flag.
            // Available mods are discovered from the pack manifest (see loadoutMods).
            activeLoadoutMod: (() => {
                try {
                    const v = localStorage.getItem("activeLoadoutMod");
                    if (v !== null) return v;
                    return localStorage.getItem("loadoutModDrunks") === "1" ? "drunks" : "";
                } catch { return ""; }
            })(),

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
            modalStashChance: null,
            modalSoldBy: null,
            modalRecipeData: null,
            modalDisassemble: null,
            modalUpgradeNodes: null,
            modalAmmoWeapons: null,
            modalLoading: false,
            copyIdFeedback: false,
            copyModalLinkFeedback: false,
            copyLinkFeedback: false,
            _restoringUrl: false,
            // Modal cross-category navigation history
            _modalNavBackStack: [],
            _modalNavFwdStack: [],
            // Last-seen scroll offset per item id, so returning to an item (via the
            // in-modal arrows OR the browser's Back/Forward) restores its position.
            // Kept independent of history.state, which background URL syncing nulls out.
            _modalScrollById: {},

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
            buildPlannerMounted: false,
            mapsActive: false,
            mapsMounted: false,
            tradingActive: false,
            tradingMounted: false,
            playerInventoryActive: false,
            playerInventoryMounted: false,
            playerInventoryParseResult: null,
            playerInventoryParsing: false,
            playerInventoryError: "",
            damageSimActive: false,
            toolsLandingActive: false,
            damageSimMounted: false,
            ballisticsMode: "weapons", // weapons | armor
            ballisticsModalOpen: false,
            ballisticsModalWeaponIds: null,
            versionCompareActive: false,
            startingLoadoutsActive: false,
            startingLoadoutsCache: null,
            startingLoadoutsFaction: null,
            startingLoadoutsDifficulty: 0,
            factionPoolsActive: false,
            factionPoolsFaction: null,
            versionCompareLoading: false,
            versionCompareResults: [],
            versionCompareFilter: "",
            versionComparePropertyFilter: [],
            versionCompareCategoryFilter: [],
            shortcutHelpOpen: false,
            weaponMechanicsOpen: false,
            quickNavOpen: false,
            _chordKey: null,
            _chordTimer: null,
            hasUnseenReleaseNotes: false,

            // What's New
            whatsNewVisible: false,
            whatsNewEntries: [],
            whatsNewTotalCount: 0,
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
            // Which hit zone the ballistic stats are shown for. Outfit + body
            // plates defend the body, headgear defends the head, and the two are
            // never both in play on a single bullet -- see ZONE_SPLIT_FIELDS.
            buildHitZone: (() => { try { return localStorage.getItem("buildHitZone") === "head" ? "head" : "body"; } catch { return "body"; } })(),
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

            // Compatible weapons popover (addon categories)
            weaponListPopoverItem: null,
            weaponListPopoverPos: null,

            // Unified item hover popover
            hoverItem: null,
            hoverPos: null,
            hoverCompareItem: null,
            hoverExtras: null,

            buildWeaponCompareSlot: "primary",  // "primary" | "secondary" | "sidearm"

            // Inventory staging area
            buildInventory: [],              // Array of { item, slotType } objects
            buildInventoryCollapsed: false,
            buildInventorySort: "none",      // "none" | "name" | "category"
            buildDragState: null,            // { source, slotType, itemId, ... } for visual feedback
        };
    },

    computed: {
        dataBasePath() {
            if (!this.activePack) return "/data";
            return `/data/${this.activePack.id}`;
        },
        hiddenFields() {
            return new Set([...this.globalHiddenFields, ...(this.activePack?.hiddenFields || [])]);
        },
        // Optional starting-loadout mods present in the current pack, discovered from
        // the manifest (starting-loadouts-<id>.json, excluding the base file). The
        // Mods-menu label for each is app_label_loadout_mod_<id>.
        loadoutMods() {
            return Object.keys(this.fileManifest || {})
                .map(f => /^starting-loadouts-(.+)\.json$/.exec(f))
                .filter(Boolean)
                .map(m => m[1])
                .sort();
        },
        hiddenWeaponStatFields() {
            const hidden = new Set();
            if (!this.showUnreliableStats) for (const f of GLOBAL_HIDDEN_WEAPON_STAT_FIELDS) hidden.add(f);
            if (PACKS_HIDE_GUN_DAMAGE_RANGE.has(this.activePack?.id)) for (const f of HIDDEN_GUN_DAMAGE_RANGE_FIELDS) hidden.add(f);
            return hidden;
        },
        weaponStatFields() {
            const hidden = this.hiddenWeaponStatFields;
            return hidden.size ? WEAPON_STAT_FIELDS.filter(f => !hidden.has(f)) : WEAPON_STAT_FIELDS;
        },

        indexById() {
            const map = {};
            for (const entry of this.index) map[entry.id] = entry;
            return map;
        },

        categoryCounts() {
            const counts = {};
            for (const item of this.index) {
                if (this.hideNoDrop && item.unobtainable === true) continue;
                if (this.hideTacticalKit && item.tacticalKit === true) continue;
                if (this.hideUnusedAmmo && item.category === 'Ammo' && this.ammoWeaponsCache) {
                    const weapons = this.ammoWeaponsCache[item.id];
                    if (!weapons || weapons.length === 0) continue;
                    if (!weapons.some(w => !(this.hideNoDrop && w.noDrop) && !(this.hideTacticalKit && w.tacticalKit))) continue;
                }
                counts[item.category] = (counts[item.category] || 0) + 1;
            }
            // "All Weapons" is the sum of all weapon categories
            let allWeapons = 0;
            for (const c of WEAPON_CATEGORIES) allWeapons += counts[c] || 0;
            counts[CAT.ALL_WEAPONS] = allWeapons;
            counts[CAT.CRAFTING] = this.craftRecipes ? Object.values(this.craftRecipes).reduce((sum, cat) => sum + cat.items.length, 0) : (counts[CAT.RECIPES] || 0);
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
            const categories = this.compareData.map(e => e.category);
            const isAttachment = categories.length > 0 && categories.every(
                c => c === CAT.SCOPES || c === CAT.SILENCERS || c === CAT.GRENADE_LAUNCHERS || c === CAT.TACTICAL_KITS
            );
            for (const h of this.compareHeaders) {
                // Weight is always identical for attachments — exclude it from the comparison
                if (isAttachment && h === 'st_prop_weight') continue;
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
            if (categories.every(c => WEAPON_CATEGORIES.includes(c))) return this.weaponStatFields;
            if (categories.every(c => c === CAT.OUTFITS || c === CAT.HELMETS)) return PROTECTION_FIELDS;
            if (categories.every(c => c === CAT.AMMO)) return [...AMMO_MULTIPLIER_FIELDS, ...AMMO_ONLY_FIELDS];
            if (categories.every(c => c === CAT.SCOPES || c === CAT.SILENCERS || c === CAT.GRENADE_LAUNCHERS || c === CAT.TACTICAL_KITS)) {
                const hidden = this.hiddenFields;
                // Weight excluded — it's always the same across attachments
                return ["st_upgr_cost", "st_data_export_zoom_factor"].filter(f =>
                    !hidden.has(f) && this.compareData.some(e => e.item[f] != null && e.item[f] !== "")
                );
            }
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
            const isKit = this.activeCategory === CAT.TACTICAL_KITS;
            const ammoKeys = new Set(["ui_ammo_types", "st_data_export_ammo_types_alt"]);
            const fields = this.displayHeaders.filter(h => {
                if (h.startsWith("Total ")) return false;
                if (h === "st_upgr_cost") return isAmmo;
                if (isKit && KIT_HIDE_FIELDS.has(h)) return false;
                return !TILE_HIDE.has(h);
            });
            const regular = fields.filter(h => !ammoKeys.has(h));
            const ammo = fields.filter(h => ammoKeys.has(h));
            return [...regular, ...ammo];
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

        parsedPerk() {
            if (!this.modalItem?.st_data_export_perk_description) return null;
            return this.parsePerk(this.modalItem);
        },

        modalWeaponAddons() {
            if (!this.modalItem || !this.weaponAddonsCache) return { scopes: [], silencers: [], launchers: [], kits: [] };
            const addons = this.weaponAddonsCache[this.modalItem.id];
            if (!addons) return { scopes: [], silencers: [], launchers: [], kits: [] };
            const resolve = (cat) => Object.fromEntries((this.categoryItems[categorySlug(cat)] || []).map(i => [i.id, i]));
            const scopeMap = resolve(CAT.SCOPES);
            const silencerMap = resolve(CAT.SILENCERS);
            const launcherMap = resolve(CAT.GRENADE_LAUNCHERS);
            const kitMap = resolve(CAT.TACTICAL_KITS);
            // A weapon's integral slots (status 1) are flagged in weapon-addons.json; tag the resolved
            // addons so the UI can badge them "Integrated". Copy the item so the shared catalogue
            // object isn't mutated.
            const integral = addons.integral || {};
            const mark = (item, isIntegral) => isIntegral ? { ...item, integral: true } : item;
            const byName = (a, b) => (this.t(a.pda_encyclopedia_name) || "").localeCompare(this.t(b.pda_encyclopedia_name) || "");
            return {
                scopes: (addons.scopes || []).map(id => scopeMap[id]).filter(Boolean).map(i => mark(i, integral.scope)).sort(byName),
                silencers: (addons.silencers || []).map(id => silencerMap[id]).filter(Boolean).map(i => mark(i, integral.silencer)).sort(byName),
                launchers: (addons.launchers || []).map(id => launcherMap[id]).filter(Boolean).map(i => mark(i, integral.launcher)).sort(byName),
                kits: (addons.kits || []).map(id => kitMap[id]).filter(Boolean).sort(byName),
            };
        },

        modalCompatibleMagazines() {
            // Gated by the Magazines feature toggle; empty unless GAMMA Mags Reloaded data is present.
            if (!this.showMagazines || !this.modalItem || !this.weaponMagazinesCache) return [];
            const ids = this.weaponMagazinesCache[this.modalItem.id];
            if (!ids || !ids.length) return [];
            const magMap = Object.fromEntries((this.categoryItems[categorySlug(CAT.MAGAZINES)] || []).map(i => [i.id, i]));
            return ids.map(id => magMap[id]).filter(Boolean)
                .sort((a, b) => (this.t(a.pda_encyclopedia_name) || "").localeCompare(this.t(b.pda_encyclopedia_name) || ""));
        },

        modalMagazineCompatibleWeapons() {
            // Compatible weapons shown on a magazine's modal (reverse lookup). Gated by toggle.
            if (!this.showMagazines || !this.modalItem || this.modalCategory !== CAT.MAGAZINES) return [];
            const weaponIds = [...new Set(this.magazineCompatibleWeaponsMap[this.modalItem.id] || [])];
            if (!weaponIds.length) return [];
            const indexMap = new Map((this.index || []).map(i => [i.id, i]));
            return weaponIds
                .map(id => {
                    const indexItem = indexMap.get(id);
                    if (!indexItem) return null;
                    const slug = categorySlug(indexItem.category);
                    const full = this.categoryItems[slug]?.find(i => i.id === id);
                    return full || indexItem;
                })
                .filter(Boolean)
                .filter(it => !(this.hideNoDrop && it.unobtainable === true) && !(this.hideTacticalKit && it.tacticalKit === true))
                .sort((a, b) => (this.tName(a) || "").localeCompare(this.tName(b) || ""));
        },

        modalKitWeapons() {
            if (!this.modalItem || this.modalCategory !== CAT.TACTICAL_KITS) return [];
            const ids = this.kitWeaponsCache?.[this.modalItem.id] || [];
            if (!ids.length) return [];
            const lookup = new Map();
            for (const slug of ["pistols", "smgs", "shotguns", "rifles", "snipers", "launchers"]) {
                for (const it of this.categoryItems[slug] || []) lookup.set(it.id, it);
            }
            return ids
                .map(wid => lookup.get(wid))
                .filter(Boolean)
                .filter(it => !(this.hideNoDrop && it.unobtainable === true) && !(this.hideTacticalKit && it.tacticalKit === true));
        },

        modalAddonCompatibleWeapons() {
            if (!this.modalItem) return [];
            // Deduplicate weapon IDs before resolving
            const weaponIds = [...new Set((this.addonCompatibleWeaponsMap || {})[this.modalItem.id] || [])];
            if (!weaponIds.length) return [];
            const indexMap = new Map((this.index || []).map(i => [i.id, i]));
            // Weapons that mount this addon integrally get badged (copy so the catalogue item isn't mutated).
            const integralSet = (this.addonIntegralWeaponsMap || {})[this.modalItem.id] || new Set();
            return weaponIds
                .map(id => {
                    const indexItem = indexMap.get(id);
                    if (!indexItem) return null;
                    // Use full item from categoryItems if already loaded (populated by openItem for addon modals)
                    const slug = categorySlug(indexItem.category);
                    const full = this.categoryItems[slug]?.find(i => i.id === id);
                    const item = full || indexItem;
                    return integralSet.has(id) ? { ...item, integral: true } : item;
                })
                .filter(Boolean)
                .filter(it => !(this.hideNoDrop && it.unobtainable === true) && !(this.hideTacticalKit && it.tacticalKit === true))
                .sort((a, b) => (this.tName(a) || '').localeCompare(this.tName(b) || ''));
        },

        modalStatRows() {
            const isWeapon = WEAPON_CATEGORIES.includes(this.modalCategory);
            const hidden = this.hiddenFields;
            const hiddenWeaponStats = isWeapon ? this.hiddenWeaponStatFields : null;
            const rows = buildStatRows(this.modalItem, this.modalHeaders).filter(r => !HEAL_FIELDS.has(r.key) && !MODAL_BADGE_KEYS.has(r.key) && !hidden.has(r.key) && !(isWeapon && r.key === "st_upgr_cost") && !(hiddenWeaponStats && hiddenWeaponStats.has(r.key)) && r.value !== null && r.value !== undefined && r.value !== "");
            // Mag. Size must resolve the same way it does in the table: the raw ui_ammo_count
            // is the Mags-mod value, wrong when the Magazines view is off (see cellValue).
            const magIdx = rows.findIndex(r => r.key === "ui_ammo_count");
            if (magIdx >= 0) rows[magIdx].value = this.cellValue(this.modalItem, "ui_ammo_count");
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
            if (this.showMagazines && this.modalItem?.magCapacity) {
                const wIdx = rows.findIndex(r => r.key === "st_prop_weight");
                const row = { key: "_mag_capacity", value: this.cellValue(this.modalItem, "_mag_capacity"), isSection: false };
                if (wIdx >= 0) rows.splice(wIdx + 1, 0, row);
                else rows.push(row);
            }
            // Inject BR+ (ballistic rating) for armour, just before BR Class — matches the card.
            if (this.modalItem && (this.modalCategory === CAT.OUTFITS || this.modalCategory === CAT.HELMETS)) {
                const br = this.cellValue(this.modalItem, "_ballistic_rating");
                if (br !== undefined) {
                    const apIdx = rows.findIndex(r => r.key === "ui_inv_ap_res");
                    const row = { key: "_ballistic_rating", value: br, isSection: false };
                    if (apIdx >= 0) rows.splice(apIdx, 0, row);
                    else rows.push(row);
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

        isWeaponSection() {
            return WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === CAT.ALL_WEAPONS;
        },

        isModalWeaponItem() {
            return WEAPON_CATEGORIES.includes(this.modalCategory) || this.modalCategory === CAT.ALL_WEAPONS;
        },

        versionComparePropertyKeys() {
            const keys = new Set();
            for (const group of this.versionCompareResults) {
                for (const item of group.items) {
                    for (const d of item.diffs) keys.add(d.key);
                }
            }
            return [...keys].sort((a, b) => this.headerLabel(a).localeCompare(this.headerLabel(b)));
        },

        versionCompareCategoryKeys() {
            return this.versionCompareResults.map(g => g.category).sort((a, b) => {
                const aLabel = this.t(this.singularCategory(a)) || this.tCat(a);
                const bLabel = this.t(this.singularCategory(b)) || this.tCat(b);
                return aLabel.localeCompare(bLabel);
            });
        },

        filteredVersionCompareResults() {
            const q = this.versionCompareFilter ? this.versionCompareFilter.toLowerCase() : "";
            const propFilter = this.versionComparePropertyFilter;
            const catFilter = this.versionCompareCategoryFilter;
            if (!q && !propFilter.length && !catFilter.length) return this.versionCompareResults;
            const groups = [];
            for (const group of this.versionCompareResults) {
                if (catFilter.length && !catFilter.includes(group.category)) continue;
                const items = group.items.filter(item => {
                    if (q && !item.name.toLowerCase().includes(q)) return false;
                    if (propFilter.length && !item.diffs.some(d => propFilter.includes(d.key))) return false;
                    return true;
                });
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

        // Traders that stock the open item for sale, with a supply-tier badge and an
        // unlock-requirement tooltip. Raw rows come from sold-by.json ([{trader,tier,cond}]);
        // names resolve via traders-meta.json.
        modalSoldByRows() {
            if (!this.modalSoldBy || !this.modalSoldBy.length) return [];
            const meta = Array.isArray(this.tradersMetaCache) ? this.tradersMetaCache : [];
            const byId = new Map(meta.map(m => [m.id, m]));
            const noReq = this.t('app_label_no_supply_req') || 'Available at base supply';
            const reqWord = this.t('app_label_supply_requires') || 'Requires';
            const orWord = this.t('app_trading_or') || 'OR';
            // Trader id prefix → faction community key understood by factionIcon().
            // Unmapped prefixes (e.g. generic_*) get no icon rather than a misleading fallback.
            const TRADER_FACTION = {
                stalker: 'stalker', bandit: 'bandit', csky: 'csky', duty: 'duty',
                ecolog: 'ecolog', freedom: 'freedom', greh: 'greh', isg: 'isg',
                mercenary: 'killer', military: 'army', monolith: 'monolith',
            };
            return this.modalSoldBy.map(e => {
                const m = byId.get(e.trader);
                let name = e.trader;
                if (m) {
                    const fromKey = this.t(m.labelKey);
                    name = fromKey !== m.labelKey ? fromKey : (this.t(m.label) || m.label || e.trader);
                }
                const conds = e.cond ? parseCondition(e.cond, this.t) : [];
                const community = TRADER_FACTION[e.trader.split('_')[0]];
                return {
                    trader: e.trader,
                    name,
                    tier: e.tier,
                    badge: e.tier === 'generic' ? 'G' : 'L' + e.tier,
                    tooltip: conds.length ? `${reqWord}: ${conds.join(` ${orWord} `)}` : noReq,
                    color: m?.color || '',
                    icon: community ? this.factionIcon(community) : null,
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
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

        modalStashChanceEntries() {
            if (!this.modalStashChance) return [];
            return Object.entries(this.modalStashChance).map(([type, data]) => ({ type, ...data }));
        },

        modalStashChanceHasRestrictedEcos() {
            if (!this.modalStashChance) return false;
            const full = [1, 2, 3];
            return Object.values(this.modalStashChance).some(
                ({ ecos }) => ecos.length !== 3 || !full.every((v, i) => ecos[i] === v)
            );
        },

        isOutfitExchange() {
            return this.activeCategory === CAT.OUTFIT_EXCHANGE;
        },

        isCrafting() {
            return this.activeCategory === CAT.CRAFTING;
        },

        materialsItems() {
            return this.categoryItems[categorySlug(CAT.MATERIALS)] || [];
        },

        craftingRecipeCategories() {
            const CRAFT_CATS = [
                { key: "device", label: "app_craft_chip_device" },
                { key: "equipment", label: "app_craft_chip_equipment" },
                { key: "repair", label: "app_craft_chip_repair" },
                { key: "upgrades", label: "app_craft_chip_upgrades" },
                { key: "medical", label: "app_craft_chip_medical" },
                { key: "ammo", label: "app_craft_chip_ammo" },
                { key: "artefact", label: "app_craft_chip_artefact" },
                { key: "furniture", label: "app_craft_chip_furniture" },
                { key: "decoration", label: "app_craft_chip_decoration" },
            ];
            const cats = CRAFT_CATS.map(c => ({
                ...c,
                count: this.craftingTrees.filter(t => t.craftCategory === c.key).length,
            })).filter(c => c.count > 0);
            const total = cats.reduce((sum, c) => sum + c.count, 0);
            return [{ key: "all", label: "app_craft_chip_all", count: total }, ...cats];
        },

        craftingFilteredCount() {
            if (!this.isCrafting) return 0;
            if (this.craftingCategory === "materials") {
                const items = this.materialsItems;
                const q = this.filterQuery.trim().toLowerCase();
                if (!q) return items.length;
                return items.filter(item =>
                    this.tName(item).toLowerCase().includes(q) ||
                    (item.sources && item.sources.some(s => this.t(s.name).toLowerCase().includes(q)))
                ).length;
            }
            return this.filteredCraftingTrees.length;
        },

        craftingDisassemblyCategories() {
            const count = this.materialsItems.length;
            return count > 0 ? [{ key: "materials", label: "app_craft_chip_materials", count }] : [];
        },

        craftingExpandLabel() {
            if (this.craftingGraphView) {
                return this._craftingTreeViewExpandAll ? this.t("app_label_collapse_all") : this.t("app_label_expand_all");
            }
            return this.craftingTreeExpandAll ? this.t("app_label_collapse_all") : this.t("app_label_expand_all");
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
            let trees = this.craftingTrees;
            // Filter by crafting sub-category
            const cat = this.craftingCategory;
            if (cat && cat !== "all" && cat !== "materials") {
                trees = trees.filter(t => t.craftCategory === cat);
            }
            if (cat === "materials") return [];
            // Apply discrete filters
            const tierFilter = this.activeFilters.toolTier;
            if (Array.isArray(tierFilter) && tierFilter.length > 0) {
                trees = trees.filter(t => tierFilter.includes(String(t.toolTier)));
            }
            const reqFilter = this.activeFilters.recipeReqName;
            if (Array.isArray(reqFilter) && reqFilter.length > 0) {
                trees = trees.filter(t => reqFilter.includes(t.recipeReqName));
            }
            // Apply text search
            const q = this.filterQuery.trim().toLowerCase();
            if (!q) return trees;
            return trees.filter(tree => {
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

        isAddonCategory() {
            return this.activeCategory === CAT.SCOPES
                || this.activeCategory === CAT.SILENCERS
                || this.activeCategory === CAT.GRENADE_LAUNCHERS
                || this.activeCategory === CAT.TACTICAL_KITS;
        },

        tileIconSize() {
            const large = new Set([...WEAPON_CATEGORIES, CAT.ALL_WEAPONS, CAT.OUTFITS, CAT.HELMETS]);
            return large.has(this.activeCategory) ? 'large' : 'small';
        },

        addonCompatibleWeaponsMap() {
            if (!this.weaponAddonsCache) return {};
            const map = {};
            for (const [weaponId, addons] of Object.entries(this.weaponAddonsCache)) {
                for (const list of [addons.scopes, addons.silencers, addons.launchers, addons.kits]) {
                    for (const id of list || []) {
                        (map[id] = map[id] || []).push(weaponId);
                    }
                }
            }
            return map;
        },

        // addon id → Set(weaponId) where the weapon mounts that addon integrally (status 1). Reverse
        // of weapon-addons.json's per-slot `integral` flags; drives the "Integrated" badge on an
        // addon's compatible-weapons list.
        addonIntegralWeaponsMap() {
            if (!this.weaponAddonsCache) return {};
            const map = {};
            const slots = [["scopes", "scope"], ["silencers", "silencer"], ["launchers", "launcher"]];
            for (const [weaponId, addons] of Object.entries(this.weaponAddonsCache)) {
                const integral = addons.integral || {};
                for (const [listKey, statusKey] of slots) {
                    if (!integral[statusKey]) continue;
                    for (const id of addons[listKey] || []) {
                        (map[id] = map[id] || new Set()).add(weaponId);
                    }
                }
            }
            return map;
        },

        magazineCompatibleWeaponsMap() {
            // Reverse of weapon-magazines.json: magazine id → [weapon ids]. Derived at
            // runtime, no extra exported data needed.
            if (!this.weaponMagazinesCache) return {};
            const map = {};
            for (const [weaponId, magIds] of Object.entries(this.weaponMagazinesCache)) {
                for (const id of magIds || []) {
                    (map[id] = map[id] || []).push(weaponId);
                }
            }
            return map;
        },

        weaponListPopoverWeapons() {
            if (!this.weaponListPopoverItem) return [];
            const weaponIds = [...new Set((this.addonCompatibleWeaponsMap || {})[this.weaponListPopoverItem.id] || [])];
            if (!weaponIds.length) return [];
            const indexMap = new Map((this.index || []).map(i => [i.id, i]));
            let weapons = weaponIds.map(wid => indexMap.get(wid)).filter(Boolean);
            if (this.hideNoDrop) weapons = weapons.filter(w => w.unobtainable !== true);
            if (this.hideTacticalKit) weapons = weapons.filter(w => w.tacticalKit !== true);
            return weapons.sort((a, b) => (this.tName(a) || '').localeCompare(this.tName(b) || ''));
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
            // ammo-weapons.json only carries id/name/category, so merge in the full
            // catalogue entry (loaded by openItem) — otherwise the hover card on each
            // tile has no stats to show.
            const list = this.modalAmmoWeapons
                .filter(w => !(this.hideNoDrop && w.noDrop) && !(this.hideTacticalKit && w.tacticalKit))
                .map(w => {
                    const full = w.category ? this.categoryItems[categorySlug(w.category)]?.find(i => i.id === w.id) : null;
                    return full ? { ...full, ...w } : w;
                });
            list.sort((a, b) => this.tName(a).localeCompare(this.tName(b)));
            return list;
        },

        // Parts (components) of the current weapon/outfit, joined against item-part-defs
        // for name/cost/weight. Each entry is navigable to its own part modal.
        modalItemParts() {
            if (!this.modalItem) return [];
            const entry = this.itemPartsCache?.[this.modalItem.id];
            if (!entry?.parts?.length) return [];
            const defs = this.itemPartDefsCache || {};
            return entry.parts.map((pid) => {
                const d = defs[pid] || {};
                return { id: pid, pda_encyclopedia_name: d.name || pid, descr: d.descr || "", cost: d.cost, weight: d.weight };
            });
        },

        // Reverse of item-parts: when viewing a part, the weapons/outfits that use it.
        // Resolved against the index so each tile is navigable.
        modalPartUsedBy() {
            if (!this.modalItem || (this.modalCategory !== CAT.WEAPON_PARTS && this.modalCategory !== CAT.OUTFIT_PARTS)) return [];
            const partId = this.modalItem.id;
            const map = this.itemPartsCache || {};
            const idx = new Map(this.index.map((e) => [e.id, e]));
            const out = [];
            for (const [itemId, entry] of Object.entries(map)) {
                if (!entry.parts?.includes(partId)) continue;
                const e = idx.get(itemId);
                if (!e) continue;
                if (this.hideNoDrop && e.unobtainable === true) continue;
                if (this.hideTacticalKit && e.tacticalKit === true) continue;
                out.push(e);
            }
            out.sort((a, b) => (this.tName(a) || "").localeCompare(this.tName(b) || ""));
            return out;
        },

        exchangeFactions() {
            return this.outfitExchange?.factions || [];
        },

        exchangeStats() {
            return this.outfitExchange?.stats || {};
        },

        // Older packs (and plain Anomaly) ship no raw armour columns, so there is
        // no Ballistic Rating to filter, sort or diff on.
        exchangeHasBallistics() {
            return Object.values(this.exchangeStats).some(
                s => typeof s.boneArmor === "number" && typeof s.hitFractionActor === "number"
            );
        },

        // exchangeItemId() scans the whole index per call, and the exchange view
        // resolves a link for every outfit on screen. Build the lookup once.
        exchangeIdByName() {
            const map = {};
            for (const item of this.index) {
                for (const key of [item.name, item.displayName, item.pda_encyclopedia_name]) {
                    if (key && !(key in map)) map[key] = item.id;
                }
            }
            return map;
        },

        // Factions that appear as the faction of an outfit you can hand in.
        exchangeSourceFactions() {
            const present = new Set((this.outfitExchange?.exchanges || []).map(ex => ex.sourceFaction).filter(Boolean));
            return this.exchangeFactions.filter(f => present.has(f));
        },

        // Factions you can actually trade with.
        exchangeTraderFactions() {
            const present = new Set();
            for (const ex of this.outfitExchange?.exchanges || []) {
                for (const f of Object.keys(ex.results)) present.add(f);
            }
            return this.exchangeFactions.filter(f => present.has(f));
        },

        // One card per outfit, with the trades that survive every filter.
        // "give" keys each card on the outfit you hand in; "want" inverts the
        // index so each card is an outfit you can receive.
        filteredExchanges() {
            if (!this.outfitExchange) return [];
            const want = this.exchangeDirection === "want";
            const stats = this.exchangeStats;
            const ids = this.exchangeIdByName;
            const q = this.filterQuery.trim().toLowerCase();
            const classF = this.activeFilters._ex_class || [];
            const artF = this.activeFilters._ex_art || [];
            const brF = this.activeFilters._ex_br || [];
            const repairF = this.activeFilters.ui_mm_repair || [];
            const upgradeOnly = this.activeFilters._ex_upgrade === true;

            // Ballistic Rating, the same 0-100 score the item tables show, rounded
            // once here so the deltas add up to what the reader sees.
            const brCache = {};
            const brOf = (name) => {
                if (name in brCache) return brCache[name];
                const s = stats[name];
                const r = s ? ballisticRating(s.boneArmor, s.hitFractionActor) : null;
                return (brCache[name] = r === null ? null : Math.round(r));
            };
            const BR_BANDS = { low: [0, 29.999], mid: [30, 49.999], high: [50, Infinity] };
            const statOk = (name) => {
                const s = stats[name];
                if (classF.length) {
                    const isExo = !!(s && s.exo);
                    if (!classF.includes(isExo ? "exo" : "std")) return false;
                }
                if (artF.length) {
                    const a = s && typeof s.art === "number" ? Math.min(s.art, 5) : null;
                    if (a === null || !artF.includes(String(a))) return false;
                }
                if (repairF.length && !repairF.includes(s?.repair)) return false;
                if (brF.length) {
                    const v = brOf(name);
                    if (v === null) return false;
                    if (!brF.some(k => BR_BANDS[k] && v >= BR_BANDS[k][0] && v <= BR_BANDS[k][1])) return false;
                }
                return true;
            };
            const delta = (fromName, toName) => {
                const a = brOf(fromName), b = brOf(toName);
                return (a !== null && b !== null) ? b - a : null;
            };
            const card = (name, faction) => ({
                key: (want ? "w:" : "g:") + faction + ":" + name,
                name,
                faction,
                id: ids[name] || null,
                stats: stats[name] || null,
                br: brOf(name),
                trades: [],
            });
            const matches = (c) => {
                if (!q) return true;
                if (this.t(c.name).toLowerCase().includes(q)) return true;
                if (this.t(c.faction).toLowerCase().includes(q)) return true;
                return c.trades.some(tr => this.t(tr.name).toLowerCase().includes(q) || this.t(tr.faction).toLowerCase().includes(q));
            };

            const cards = [];
            if (!want) {
                for (const ex of this.outfitExchange.exchanges) {
                    if (this.exchangeSourceFilter && ex.sourceFaction !== this.exchangeSourceFilter) continue;
                    if (!statOk(ex.name)) continue;
                    const c = card(ex.name, ex.sourceFaction);
                    for (const [f, out] of Object.entries(ex.results)) {
                        if (this.exchangeFactionFilter && f !== this.exchangeFactionFilter) continue;
                        const d = delta(ex.name, out);
                        if (upgradeOnly && !(d !== null && d > 0)) continue;
                        c.trades.push({ faction: f, name: out, id: ids[out] || null, delta: d });
                    }
                    if (c.trades.length && matches(c)) cards.push(c);
                }
            } else {
                // You receive faction F's outfit by trading with faction F, so the
                // card's faction is the trader; each row is an outfit you hand in.
                const byOutfit = new Map();
                for (const ex of this.outfitExchange.exchanges) {
                    if (this.exchangeSourceFilter && ex.sourceFaction !== this.exchangeSourceFilter) continue;
                    for (const [f, out] of Object.entries(ex.results)) {
                        if (this.exchangeFactionFilter && f !== this.exchangeFactionFilter) continue;
                        if (!statOk(out)) continue;
                        const d = delta(ex.name, out);
                        if (upgradeOnly && !(d !== null && d > 0)) continue;
                        const cardKey = f + ":" + out;
                        if (!byOutfit.has(cardKey)) byOutfit.set(cardKey, card(out, f));
                        byOutfit.get(cardKey).trades.push({ faction: ex.sourceFaction, name: ex.name, id: ids[ex.name] || null, delta: d });
                    }
                }
                for (const c of byOutfit.values()) if (matches(c)) cards.push(c);
            }

            const bestGain = c => c.trades.reduce((m, tr) => Math.max(m, tr.delta === null ? -Infinity : tr.delta), -Infinity);
            const byName = (a, b) => this.t(a.name).localeCompare(this.t(b.name));
            if (this.exchangeSort === "count") cards.sort((a, b) => b.trades.length - a.trades.length || byName(a, b));
            else if (this.exchangeSort === "gain") cards.sort((a, b) => bestGain(b) - bestGain(a) || byName(a, b));
            else cards.sort(byName);
            return cards;
        },

        // Matrix columns: only factions that still appear in the filtered cards.
        exchangeMatrixFactions() {
            const present = new Set();
            for (const c of this.filteredExchanges) {
                for (const tr of c.trades) present.add(tr.faction);
            }
            return this.exchangeFactions.filter(f => present.has(f));
        },

        exchangeTradeCount() {
            return this.filteredExchanges.reduce((n, c) => n + c.trades.length, 0);
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

            const hidden = this.hiddenFields;
            const isWeaponCategory = WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === CAT.ALL_WEAPONS;
            const hiddenWeaponStats = isWeaponCategory ? this.hiddenWeaponStatFields : null;
            const filtered = raw.filter((h) => {
                if (h === "id" || h === "st_upgr_cost" || h === "displayName") return false;
                // base_mag_size is not its own column — it feeds the ui_ammo_count cell
                // when the Magazines view is off (see cellValue).
                if (h === "base_mag_size") return false;
                if (h === "st_data_export_description") return false;
                if (hidden.has(h)) return false;
                if (hiddenWeaponStats && hiddenWeaponStats.has(h)) return false;
                if (NAME_TAG_COLS.has(h)) return false;
                if (HEAL_FIELDS.has(h)) return false;
                if (items.length > 0) {
                    const first = items[0][h] ?? "";
                    if (items.every((item) => (item[h] ?? "") === first)) return false;
                }
                return true;
            });

            if (raw.includes("st_upgr_cost") && !isWeaponCategory) {
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

            // Inject Origin (factions) column when items carry NATO/WP classification
            if (items.some(i => Array.isArray(i.factions) && i.factions.length)) {
                const typeIdx = filtered.indexOf("Type");
                if (typeIdx >= 0) filtered.splice(typeIdx + 1, 0, "factions");
                else filtered.push("factions");
            }

            // Inject malfunction chance after reliability
            const reliIdx = filtered.indexOf("ui_inv_reli");
            if (reliIdx >= 0) {
                filtered.splice(reliIdx + 1, 0, "_malfunction_chance");
            }

            // Inject BR+ (composite ballistic rating) for armour, just before BR Class.
            // Only when the raw calc inputs are present (absent on older packs / plain Anomaly).
            if ((this.activeCategory === CAT.OUTFITS || this.activeCategory === CAT.HELMETS)
                && items.some(i => typeof i.boneArmor === "number" && typeof i.hitFractionActor === "number")) {
                const apIdx = filtered.indexOf("ui_inv_ap_res");
                if (apIdx >= 0) filtered.splice(apIdx, 0, "_ballistic_rating");
                else filtered.push("_ballistic_rating");
            }

            // Inject magazine carry capacity (Magazines mod) when enabled and present
            if (this.showMagazines && items.some((i) => i.magCapacity)) {
                const wIdx = filtered.indexOf("st_prop_weight");
                if (wIdx >= 0) filtered.splice(wIdx + 1, 0, "_mag_capacity");
                else filtered.push("_mag_capacity");
            }

            // Inject compatible weapons count for addon categories
            if (this.isAddonCategory) {
                filtered.push("_compatible_weapons");
            }

            // Inject scope count for weapon categories
            if (isWeaponCategory && this.weaponAddonsCache) {
                filtered.push("_num_scopes");
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
            // The exchange view has no table columns, so its filters are declared
            // here rather than derived from headers. They reuse the shared filter
            // panel, active-chip row and URL persistence unchanged.
            if (this.isOutfitExchange) {
                if (!this.outfitExchange) return [];
                // Repair classes reuse the shared def so their chips carry the
                // same labels and colours as the Outfits table.
                const repairDef = FILTER_DEFS.find(d => d.key === "ui_mm_repair");
                const repairValues = new Set();
                for (const s of Object.values(this.exchangeStats)) {
                    if (s.repair) repairValues.add(s.repair);
                }
                return [
                    { key: "_ex_class", type: "discrete", label: "app_ex_filter_class", values: ["exo", "std"],
                      labelMap: { exo: "app_ex_class_exo", std: "app_ex_class_std" } },
                    ...(repairDef && repairValues.size
                        ? [{ ...repairDef, values: repairDef.values.filter(v => repairValues.has(v)) }]
                        : []),
                    { key: "_ex_art", type: "discrete", label: "app_ex_filter_art", values: ["1", "2", "3", "4", "5"],
                      displayMap: { 5: "5+" } },
                    ...(this.exchangeHasBallistics ? [
                        { key: "_ex_br", type: "discrete", label: "app_ex_filter_br", values: ["low", "mid", "high"],
                          labelMap: { low: "app_ex_br_low", mid: "app_ex_br_mid", high: "app_ex_br_high" } },
                        { key: "_ex_upgrade", type: "present", label: "app_ex_upgrade_only" },
                    ] : []),
                ];
            }
            const headers = this.displayHeaders;
            if (!headers.length) return [];
            const slug = categorySlug(this.activeCategory);
            const raw = this.categoryHeaders[slug] || [];
            const items = this.categoryItems[slug] || [];
            const existingDefs = FILTER_DEFS.filter(def => {
                if (def.type === "has-effect") {
                    return [...def.fields].some(f => headers.includes(f) || raw.includes(f));
                }
                if (def.type === "flag") {
                    return raw.includes(def.key);
                }
                if (def.type === "present") {
                    if (def.key === "_has_launcher") {
                        const isWeaponCat = WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === CAT.ALL_WEAPONS;
                        return isWeaponCat && !!this.weaponAddonsCache &&
                            Object.values(this.weaponAddonsCache).some(a => a.launchers && a.launchers.length > 0);
                    }
                    return raw.includes(def.key) && items.some(i => i[def.key]);
                }
                if (def.key === "ui_st_community") return raw.includes("ui_st_community");
                if (def.arrayField) return items.some(i => Array.isArray(i[def.key]) && i[def.key].length > 0);
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
                if (def.arrayField && def.type === "discrete") {
                    const present = new Set();
                    for (const item of items) {
                        const arr = item[def.key];
                        if (Array.isArray(arr)) for (const v of arr) present.add(String(v));
                    }
                    const filtered = Array.isArray(def.values)
                        ? def.values.filter(v => present.has(String(v)))
                        : [...present].sort();
                    return filtered.length > 0 ? { ...def, values: filtered } : null;
                }
                if (def.type === "discrete" && def.dynamic) {
                    const vals = new Set();
                    for (const item of items) {
                        const v = item[def.key];
                        if (v !== undefined && v !== null && v !== "") {
                            if (def.key === "ui_ammo_types" || def.multiValue) {
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
                if (def.type === "discrete" && Array.isArray(def.values)) {
                    const present = new Set();
                    for (const item of items) {
                        const v = item[def.key];
                        if (v !== undefined && v !== null && v !== "") present.add(String(v));
                    }
                    const filtered = def.values.filter(v => present.has(String(v)));
                    return filtered.length > 0 ? { ...def, values: filtered } : null;
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

        craftingAvailableFilters() {
            if (!this.isCrafting || this.craftingCategory === "materials" || this.craftingCategory === "artefact") return [];
            // Gather all recipe items for current view
            let items;
            if (this.craftingCategory === "all") {
                items = this.craftRecipes ? Object.values(this.craftRecipes).flatMap(c => c.items) : [];
            } else {
                items = this.craftRecipes?.[this.craftingCategory]?.items || [];
            }
            if (!items.length) return [];

            const filters = [];
            // Tool Tier discrete filter
            const tiers = new Set(items.map(i => i.toolTier).filter(Boolean));
            if (tiers.size > 1) {
                filters.push({
                    key: "toolTier",
                    type: "discrete",
                    label: this.t("app_craft_tool_tier"),
                    values: [...tiers].sort().map(t => String(t)),
                    format: (v) => this.t("app_craft_toolkit_" + v),
                });
            }
            // Recipe Requirement discrete filter
            const reqs = new Set();
            for (const item of items) {
                if (item.recipeReqName) reqs.add(item.recipeReqName);
            }
            if (reqs.size > 1) {
                filters.push({
                    key: "recipeReqName",
                    type: "discrete",
                    label: this.t("app_craft_requires"),
                    values: [...reqs].sort((a, b) => this.t(a).localeCompare(this.t(b))),
                    translate: true,
                });
            }
            return filters;
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
                const def = FILTER_DEFS.find(d => d.key === key) || this.availableFilters.find(d => d.key === key);
                if (!def) continue;
                if (def.type === "flag" && (val === true || val === false)) {
                    chips.push({ key, label: def.label, value: val, display: val ? this.t("app_label_yes") : this.t("app_label_no"), type: "flag" });
                } else if (def.type === "present" && val === true) {
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
                const q = this.filterQuery.trim();
                const idHits = this.idMatchItems(items, q);
                if (idHits) return idHits;
                const fuse = new Fuse(items, { keys: ["localeName", "id"], threshold: 0.35 });
                return fuse.search(q).map(r => r.item);
            }
            if (this.recentViewActive) {
                const indexMap = new Map(this.index.map(i => [i.id, i]));
                let items = this.recentIds.map(id => indexMap.get(id)).filter(Boolean);
                if (!this.filterQuery.trim()) return items;
                const q = this.filterQuery.trim();
                const idHits = this.idMatchItems(items, q);
                if (idHits) return idHits;
                const fuse = new Fuse(items, { keys: ["localeName", "id"], threshold: 0.35 });
                return fuse.search(q).map(r => r.item);
            }
            if (!this.activeCategory) return [];
            const slug = categorySlug(this.activeCategory);
            let items = this.categoryItems[slug] || [];
            if (this.hideNoDrop || this.hideTacticalKit) {
                if (this.hideNoDrop) items = items.filter((i) => i.unobtainable !== true);
                if (this.hideTacticalKit) items = items.filter((i) => i.tacticalKit !== true);
                if (this.isAddonCategory) {
                    const indexMap = new Map((this.index || []).map(i => [i.id, i]));
                    items = items.filter(i => {
                        const weaponIds = (this.addonCompatibleWeaponsMap || {})[i.id] || [];
                        return weaponIds.some(wid => {
                            const w = indexMap.get(wid);
                            return w && !(this.hideNoDrop && w.unobtainable === true) && !(this.hideTacticalKit && w.tacticalKit === true);
                        });
                    });
                }
            }
            if (this.hideUnusedAmmo && slug === 'ammo' && this.ammoWeaponsCache) {
                items = items.filter(i => {
                    const weapons = this.ammoWeaponsCache[i.id];
                    if (!weapons || weapons.length === 0) return false;
                    return weapons.some(w => !(this.hideNoDrop && w.noDrop) && !(this.hideTacticalKit && w.tacticalKit));
                });
            }
            items = this.applyFilters(items);
            if (this.showFavoritesOnly) {
                const favSet = new Set(this.favoriteIds);
                items = items.filter(i => favSet.has(i.id));
            }
            if (!this.filterQuery.trim()) return items;
            const q = this.filterQuery.trim();
            const idHits = this.idMatchItems(items, q);
            if (idHits) return idHits;
            const fuse = this.categoryFuse[slug];
            if (!fuse) return items;
            const filtered = new Set(items);
            return fuse.search(q).map((r) => r.item).filter((i) => filtered.has(i));
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
            const isWeapon = WEAPON_CATEGORIES.includes(this.activeCategory) || this.activeCategory === CAT.ALL_WEAPONS;
            if (isWeapon && this.weaponAddonsCache && !allHeaders.includes("_num_scopes")) {
                allHeaders.push("_num_scopes");
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

            // Which slots are in play for the selected hit zone. Only meaningful
            // for ZONE_SPLIT_FIELDS and BR Class; everything else stays merged.
            const zone = this.buildHitZone;
            const zoneInactiveSlot = zone === "head" ? "outfit" : "helmet";

            // Sum protections with per-slot-type segments
            const protections = {};
            for (const f of PROTECTION_FIELDS) {
                const slotTotals = { outfit: 0, helmet: 0, backpack: 0, belt: 0, artifact: 0 };
                const split = this.buildZoneSplitActive && ZONE_SPLIT_FIELDS.has(f);
                const breakdown = [];
                for (const { item, slot } of all) {
                    if (!(slot in slotTotals)) continue;
                    const v = parseNum(item[f]);
                    // A split field's off-zone piece contributes nothing at all --
                    // ADB zeroes it outright rather than weighting it down -- but
                    // it still lists, greyed, so the tile doesn't look like it
                    // silently dropped the item.
                    const inactive = split && slot === zoneInactiveSlot;
                    if (v !== 0) breakdown.push({ name: item.pda_encyclopedia_name || item.id, value: v, slot, inactive });
                    if (!inactive) slotTotals[slot] += v;
                }
                // Apply overall resist cap: base 65% + sum of gamma_*_cap from all
                // items, then ADB's absolute 90% ceiling on top of that.
                const capField = CAP_FIELD_MAP[f];
                let total = slotTotals.outfit + slotTotals.helmet + slotTotals.belt + slotTotals.artifact + slotTotals.backpack;
                let capped = false;
                if (capField && total > 0) {
                    let capSum = 0;
                    for (const { item } of all) {
                        capSum += parseNum(item[capField]);
                    }
                    const maxResist = Math.min(BASE_RESIST_CAP + capSum, PROTECTION_HARD_CAP);
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
                protections[f] = { total, breakdown, capped, split, segments: slotTotals };
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
            // BR Class -- the penetration gate, not a damage reduction. `ui_inv_ap_res`
            // is (1 - hit_fraction_actor) * cond * 100 and lives on outfits and helmets
            // only; belt items contribute through ADB's mitigation table instead, whose
            // apRes is the same scale as a fraction. Ballistic plates have no head-table
            // entry at all (they do nothing for a helmet), which is why this reads the
            // per-zone table rather than the body-only item column.
            const beltMit = this.buildPlateMitigation;
            const armorBreakdown = [];
            const armorSegments = { outfit: 0, helmet: 0, backpack: 0, belt: 0, artifact: 0 };
            let armorPoints = 0;
            const otherZone = zone === "body" ? "head" : "body";
            for (const { item, slot } of all) {
                if (slot !== "outfit" && slot !== "helmet" && slot !== "belt" && slot !== "artifact") continue;
                // One rule for both kinds of off-zone piece: an armour piece is
                // zeroed by the zone it doesn't guard, and a ballistic plate simply
                // has no head-table entry. Either way it contributes nothing here
                // but does in the other zone, so it lists greyed rather than
                // vanishing -- which would read as the item having been dropped.
                const apResIn = (z) => Math.round((beltMit[z]?.[item.id]?.apRes || 0) * 1000) / 10;
                let v, elsewhere;
                if (slot === "outfit" || slot === "helmet") {
                    elsewhere = parseNum(item["ui_inv_ap_res"]);
                    v = (this.buildZoneSplitActive && slot === zoneInactiveSlot) ? 0 : elsewhere;
                } else {
                    v = apResIn(zone);
                    elsewhere = apResIn(otherZone);
                }
                const inactive = v === 0 && elsewhere !== 0;
                if (v === 0 && !inactive) continue;
                armorBreakdown.push({ name: item.pda_encyclopedia_name || item.id, value: inactive ? elsewhere : v, slot, inactive });
                if (inactive) continue;
                armorPoints += v;
                armorSegments[slot] += v;
            }

            // Stopped-round premitigation. A flat 40% the moment a bullet fails to
            // penetrate, plus each belt item's own bonus, hard-capped at 90%. This
            // multiplies with the flat protection above rather than adding to it.
            // Nothing is ever stopped without a BR Class to stop it with, so the
            // whole bucket stays absent until there is one -- keeping this the
            // single condition the tile and "expand all" both key off.
            const stoppedBreakdown = [];
            let stoppedBonus = BASE_PREMITIGATION;
            if (this.buildZoneSplitActive && armorPoints > 0) {
                stoppedBreakdown.push({ name: "app_build_stopped_base", value: BASE_PREMITIGATION, slot: "base", inactive: false });
                for (const { item, slot } of all) {
                    if (slot !== "belt" && slot !== "artifact") continue;
                    const v = Math.round((beltMit[zone]?.[item.id]?.premitigation || 0) * 1000) / 10;
                    if (v === 0) continue;
                    stoppedBreakdown.push({ name: item.pda_encyclopedia_name || item.id, value: v, slot, inactive: false });
                    stoppedBonus += v;
                }
            }
            const stoppedCapped = stoppedBonus > PROTECTION_HARD_CAP;
            if (stoppedCapped) stoppedBonus = PROTECTION_HARD_CAP;

            // Speed (outfit-only)
            const speed = this.buildOutfit ? parseNum(this.buildOutfit["ui_inv_outfit_speed"]) : null;

            // Sort breakdowns descending by value, with off-zone rows last so the
            // contributing items read as a block.
            const sortDesc = arr => arr.sort((a, b) => (a.inactive === b.inactive ? b.value - a.value : (a.inactive ? 1 : -1)));
            sortDesc(weightBreakdown);
            sortDesc(carryBreakdown);
            sortDesc(armorBreakdown);
            // The base row is the bucket's floor, not a contribution, so it stays
            // pinned at the top and only the item rows below it sort.
            if (stoppedBreakdown.length > 1) {
                const [base, ...items] = stoppedBreakdown;
                stoppedBreakdown.splice(0, stoppedBreakdown.length, base, ...sortDesc(items));
            }
            for (const f of PROTECTION_FIELDS) sortDesc(protections[f].breakdown);
            for (const f of RESTORATION_FIELDS) sortDesc(restorations[f].breakdown);

            return { protections, restorations, totalWeight, weightBreakdown, weightSegments, carryWeight, carryBreakdown, carrySegments, baseCarryWeight, totalCarryCapacity, armorPoints, armorBreakdown, armorSegments, stoppedBonus, stoppedBreakdown, stoppedCapped, speed };
        },

        // The body/head split only makes sense where ADB's per-zone mitigation
        // table shipped with the pack -- plain Anomaly and pre-0.9.5 GAMMA extracts
        // have no such data, so those packs keep the old merged totals.
        buildPlateMitigation() {
            const mit = this.plateMitigationCache;
            return (mit && mit.body && mit.head) ? mit : { body: {}, head: {} };
        },

        buildZoneSplitActive() {
            const mit = this.plateMitigationCache;
            return !!(mit && mit.body && mit.head);
        },

        factionList() { return FACTION_LIST.map(id => ({ id, label: this.t(id) || id })); },

        buildAllExpanded() {
            const stats = this.buildCombinedStats;
            const allFields = ["weight", "carry", "armor", "stopped", ...PROTECTION_FIELDS, ...RESTORATION_FIELDS];
            const wpnFields = this.buildWeaponStats ? this.buildWeaponStats.stats.filter(s => s.modifier != null).map(s => "wpn_" + s.field) : [];
            const expandable = allFields.filter(f => {
                if (f === "weight") return stats.weightBreakdown.length > 0;
                if (f === "carry") return stats.carryBreakdown.length > 0;
                if (f === "armor") return stats.armorBreakdown.length > 0;
                if (f === "stopped") return stats.stoppedBreakdown.length > 0;
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
            for (const field of this.weaponStatFields) {
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
                if (this.hideNoDrop) items = items.filter(i => i.unobtainable !== true);
                if (this.hideTacticalKit) items = items.filter(i => i.tacticalKit !== true);
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
                if (this.hideNoDrop) items = items.filter(i => i.unobtainable !== true);
                if (this.hideTacticalKit) items = items.filter(i => i.tacticalKit !== true);
                return searchOrSort(items);
            }

            const cat = BUILD_SLOT_CATEGORIES[slotType];
            if (!cat) return [];
            const slug = categorySlug(cat);
            let items = this.categoryItems[slug] || [];
            if (this.hideNoDrop) items = items.filter(i => i.unobtainable !== true);
            if (this.hideTacticalKit) items = items.filter(i => i.tacticalKit !== true);
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
            // Items sharing a translated name (e.g. the many addons all named
            // "Tactical Kit") carry the name key of the weapon they apply to,
            // rendered as a localized suffix; collisions within the same
            // weapon carry a #N qualifier
            if (item.nameSuffixKey) {
                const num = item.nameSuffixNum ? ` #${item.nameSuffixNum}` : "";
                return `${translated} [${this.t(item.nameSuffixKey)}${num}]`;
            }
            const display = item.displayName || nameKey;
            const bracket = display.lastIndexOf(" [");
            if (bracket < 0) return translated;
            // Kit-derived weapons get a localized suffix instead of the raw ID suffix;
            // groups with several kit variants carry a #N qualifier to stay distinct
            if (item.kitSuffix === true) {
                const num = item.kitSuffixNum ? ` #${item.kitSuffixNum}` : "";
                return `${translated} [${this.t('app_suffix_kit')}${num}]`;
            }
            return translated + display.slice(bracket);
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
            if (cat === CAT.SCOPES) return !!this.fileManifest["scopes.json"];
            if (cat === CAT.SILENCERS) return !!this.fileManifest["silencers.json"];
            if (cat === CAT.GRENADE_LAUNCHERS) return !!this.fileManifest["grenade-launchers.json"];
            if (cat === CAT.TACTICAL_KITS) return !!this.fileManifest["tactical-kits.json"];
            return true;
        },

        async fetchJsonCached(cacheKey, filename) {
            if (this[cacheKey] !== null) return this[cacheKey];
            if (!this.fileManifest[filename]) { this[cacheKey] = {}; return this[cacheKey]; }
            try {
                const res = await fetch(this.dataUrl(filename));
                if (!res.ok) {
                    console.warn(`Failed to fetch ${filename}: HTTP ${res.status}`);
                    this[cacheKey] = {};
                } else {
                    this[cacheKey] = await res.json();
                }
            } catch (e) {
                console.warn(`Failed to fetch ${filename}:`, e);
                this[cacheKey] = {};
            }
            return this[cacheKey];
        },

        async ensureArmorForSim() {
            // Actor-target mode in the damage simulator needs outfit + helmet data,
            // which load lazily. Trigger both so the armour pickers populate.
            await Promise.all([
                this.ensureCategoryLoaded("outfits"),
                this.ensureCategoryLoaded("helmets"),
            ]);
        },

        async ensureCategoryLoaded(slug) {
            if (this.categoryItems[slug]) return;
            const filename = `${slug}.json`;
            if (!this.fileManifest[filename]) return;
            try {
                const res = await fetch(this.dataUrl(filename));
                if (!res.ok) { console.warn(`Failed to load category ${slug}: HTTP ${res.status}`); return; }
                const data = await res.json();
                if (data.items) this.categoryItems[slug] = markRaw(data.items);
                if (data.headers) this.categoryHeaders[slug] = data.headers;
            } catch (e) {
                console.warn(`Failed to load category ${slug}:`, e);
            }
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

        fetchStashChance() {
            return this.fetchJsonCached("stashChanceCache", "item-stash-chance.json");
        },

        fetchSoldBy() {
            return this.fetchJsonCached("soldByCache", "sold-by.json");
        },

        fetchTradersMeta() {
            return this.fetchJsonCached("tradersMetaCache", "traders-meta.json");
        },

        fetchRecipes() {
            return this.fetchJsonCached("recipesCache", "recipes.json");
        },

        fetchCraftRecipes() {
            return this.fetchJsonCached("craftRecipesCache", "craft-recipes.json");
        },

        /** Lazy-load craft recipes outside the Crafting tab (e.g. inventory workbench). */
        ensureCraftRecipes() {
            if (this.craftRecipes || !this.fileManifest || !this.fileManifest['craft-recipes.json']) return;
            this.fetchCraftRecipes().then(craftData => {
                if (!craftData) return;
                this.craftRecipes = markRaw(craftData);
                if (this.craftingTrees.length === 0) {
                    this.buildCraftingTreeData(craftData);
                }
            }).catch(() => {});
        },

        fetchDisassemble() {
            return this.fetchJsonCached("disassembleCache", "disassemble.json");
        },

        fetchItemParts() {
            return this.fetchJsonCached("itemPartsCache", "item-parts.json");
        },

        fetchItemPartDefs() {
            return this.fetchJsonCached("itemPartDefsCache", "item-part-defs.json");
        },

        fetchAmmoWeapons() {
            return this.fetchJsonCached("ammoWeaponsCache", "ammo-weapons.json");
        },

        fetchUpgrades() {
            return this.fetchJsonCached("upgradesCache", "upgrades.json");
        },

        fetchWeaponAddons() {
            return this.fetchJsonCached("weaponAddonsCache", "weapon-addons.json");
        },

        fetchWeaponAddonStatus() {
            return this.fetchJsonCached("weaponAddonStatusCache", "weapon-addon-status.json");
        },

        fetchWeaponMagazines() {
            return this.fetchJsonCached("weaponMagazinesCache", "weapon-magazines.json");
        },

        fetchKitWeapons() {
            return this.fetchJsonCached("kitWeaponsCache", "kit-weapons.json");
        },

        fetchMutantProfiles() {
            return this.fetchJsonCached("mutantProfilesCache", "mutant-profiles.json");
        },

        fetchNpcArmorProfiles() {
            return this.fetchJsonCached("npcArmorProfilesCache", "npc-armor-profiles.json");
        },

        fetchGboConstants() {
            return this.fetchJsonCached("gboConstantsCache", "gbo-constants.json");
        },

        fetchPbaConstants() {
            return this.fetchJsonCached("pbaConstantsCache", "pba-constants.json");
        },

        // ADB's per-belt-item ballistic contribution, split into body/head tables
        // (mitigation_table_body / mitigation_table_head in the ADB script). The
        // item columns carry the body numbers only, so the head half has to come
        // from here. Absent on non-GAMMA packs -- see buildPlateMitigation.
        fetchPlateMitigation() {
            return this.fetchJsonCached("plateMitigationCache", "adb-plate-mitigation.json");
        },

        // Everything the save-import loadout drawer needs beyond the save's own
        // categories: the ballistic mitigation table, plus the two belt categories
        // so its picker can offer plates and artefacts the player doesn't own yet
        // (and so resolveFull can tell a backpack from a plate).
        ensureLoadoutData() {
            return Promise.all([
                this.fetchPlateMitigation(),
                this.ensureCategoryLoaded("belt-attachments"),
                this.ensureCategoryLoaded("artefacts"),
            ]);
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

            // Cache category data (items + Fuse) so filtering works if the user
            // later navigates to this category, and so getColumnRanges can use full
            // data for chart normalisation.
            if (!this.categoryItems[slug]) {
                for (const item of catData.items) {
                    item.localeName = this.tName(item);
                }
                this.categoryItems[slug] = catData.items;
                this.categoryHeaders[slug] = catData.headers;
                this.categoryFuse[slug] = new Fuse(catData.items, {
                    keys: ["displayName", "pda_encyclopedia_name", "localeName", "id", "ui_ammo_types", "st_data_export_ammo_types_alt"],
                    threshold: 0.35,
                });
            }

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
                this.index = markRaw(await indexRes.json());
                this.categories = catRes.ok
                    ? await catRes.json()
                    : [...new Set(this.index.map((i) => i.category))].sort();
                this.buildGroupedCategories();
                this.rebuildGlobalFuse();
                if (this.groupedCategories.length > 0) {
                    const pathParsed = parsePathUrl(window.location.pathname);
                    const urlCat = pathParsed.cat || new URLSearchParams(window.location.search).get("cat");
                    if (urlCat === "build-planner" || pathParsed.buildPlanner) {
                        // Defer to mounted handler
                    } else if (urlCat === "tools" || pathParsed.toolsLanding) {
                        this.toolsLandingActive = true;
                        this.activeCategory = null;
                    } else if (urlCat === "ballistics" || pathParsed.damageSim) {
                        await this.openDamageSim();
                    } else if (urlCat === "armor" || pathParsed.armorProtection) {
                        await this.openArmorProtection();
                    } else if (urlCat === "maps" || pathParsed.maps) {
                        this.mapsActive = true;
                        this.mapsMounted = true;
                        this.activeCategory = null;
                    } else if (urlCat === "trading" || pathParsed.trading) {
                        this.tradingActive = true;
                        this.tradingMounted = true;
                        this.activeCategory = null;
                    } else if (urlCat === "inventory" || pathParsed.playerInventory) {
                        this.playerInventoryActive = true;
                        this.playerInventoryMounted = true;
                        this.ensureLoadoutData();
                        this.activeCategory = null;
                        this.loadPlayerInventoryFromStorage();
                    } else if (urlCat === "version-compare" || pathParsed.versionCompare) {
                        // Defer to restoreUrlState
                    } else if (urlCat === "starting-loadouts" || pathParsed.startingLoadouts) {
                        await this.openStartingLoadouts();
                    } else if (urlCat === "faction-drops" || pathParsed.factionPools) {
                        await this.openFactionPools();
                    } else if (urlCat === "favorites" || pathParsed.favorites) {
                        this.favoritesViewActive = true;
                        this.activeCategory = null;
                        this.sortCol = "pda_encyclopedia_name";
                    } else if (urlCat === "recent" || pathParsed.recent) {
                        this.recentViewActive = true;
                        this.activeCategory = null;
                        this.sortCol = "pda_encyclopedia_name";
                    } else if (urlCat && CRAFTING_SUBCATEGORIES.has(urlCat)) {
                        await this.selectCategory(CAT.CRAFTING);
                        this.craftingCategory = urlCat;
                    } else {
                        const match = urlCat && (this.categories.find(c => categorySlug(c) === urlCat) || [...VIRTUAL_CATEGORIES].find(c => categorySlug(c) === urlCat));
                        await this.selectCategory(match || this.groupedCategories[0].categories[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to load index:", e);
            }
            this.calibers = await this.fetchCalibers();
            await Promise.all([
                this.ensureCategoryLoaded(categorySlug(CAT.AMMO)),
                this.ensureCategoryLoaded(categorySlug(CAT.SCOPES)),
                this.ensureCategoryLoaded(categorySlug(CAT.SILENCERS)),
                this.ensureCategoryLoaded(categorySlug(CAT.GRENADE_LAUNCHERS)),
                this.ensureCategoryLoaded(categorySlug(CAT.TACTICAL_KITS)),
                this.fetchWeaponAddons(),
                this.fetchPbaConstants(),
            ]);
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
            this.stashChanceCache = null;
            this.recipesCache = null;
            this.craftRecipesCache = null;
            this.craftRecipes = null;
            this.disassembleCache = null;
            this.upgradesCache = null;
            this.ammoWeaponsCache = null;
            this.weaponAddonsCache = null;
            this.weaponMagazinesCache = null;
            this.kitWeaponsCache = null;
            this.plateMitigationCache = null;
            this.outfitExchange = null;
            this.startingLoadoutsCache = null;
            this.displayLabels = {};
            this.translations = null;
            this.craftingTrees = [];
            this.index = [];
            this.calibers = {};
            this.globalQuery = "";
            this.globalResults = [];
            this.globalCraftingResults = [];
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

        idMatchItems(items, q) {
            const exact = items.find(i => i.id === q);
            if (exact) return [exact];
            const prefix = items.filter(i => i.id.startsWith(q));
            if (prefix.length) return prefix;
            return null;
        },

        globalSearchFilter(items) {
            return items.filter(item => {
                if (this.hideNoDrop && item.unobtainable === true) return false;
                if (this.hideTacticalKit && item.tacticalKit === true) return false;
                if (this.hideUnusedAmmo && item.category === 'Ammo' && this.ammoWeaponsCache) {
                    const weapons = this.ammoWeaponsCache[item.id];
                    if (!weapons || weapons.length === 0) return false;
                    if (!weapons.some(w => !(this.hideNoDrop && w.noDrop) && !(this.hideTacticalKit && w.tacticalKit))) return false;
                }
                return true;
            });
        },

        globalSearch() {
            if (!this.globalQuery.trim()) {
                this.globalResults = [];
                this.globalCraftingResults = [];
                return;
            }
            const q = this.globalQuery.trim();
            const pool = this.globalSearchFilter(this.index);

            // 1. ID exact / prefix match
            const idHits = this.idMatchItems(pool, q);
            if (idHits) {
                this.globalResults = idHits;
                this.globalCraftingResults = this._searchCraftingTrees(q);
                return;
            }

            // 2. Normalized name match — strips spaces, hyphens, underscores, dots
            //    so "ai2" matches "AI-2 Medkit", "allwe" matches "All Weapons", etc.
            const qNorm = q.toLowerCase().replace(/[\s\-_.]/g, '');
            const normHits = qNorm.length >= 2
                ? pool.filter(i => (i.localeName || '').toLowerCase().replace(/[\s\-_.]/g, '').includes(qNorm))
                : [];

            // 3. Fuse fuzzy match
            const poolSet = new Set(pool);
            const fuseHits = this.fuse
                .search(q)
                .slice(0, 50)
                .map(r => r.item)
                .filter(i => poolSet.has(i));

            // 4. Merge: normalized hits first, then fuse (deduped), max 50
            const seen = new Set(normHits.map(i => i.id));
            const merged = [...normHits];
            for (const item of fuseHits) {
                if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
            }
            this.globalResults = merged.slice(0, 50);

            // 5. Crafting results (from already-loaded trees or raw recipe data)
            this.globalCraftingResults = this._searchCraftingTrees(q);

            // Lazy-load craft recipes the first time user searches (before visiting Crafting tab)
            if (!this.craftRecipes && this.fileManifest && this.fileManifest['craft-recipes.json']) {
                const capturedQ = q;
                this.fetchCraftRecipes().then(craftData => {
                    if (!craftData) return;
                    this.craftRecipes = craftData;
                    if (this.craftingTrees.length === 0) {
                        this.buildCraftingTreeData(craftData);
                    }
                    // Only update if the search query hasn't changed
                    if (this.globalQuery.trim() === capturedQ) {
                        this.globalCraftingResults = this._searchCraftingTrees(capturedQ);
                    }
                }).catch(() => {});
            }
        },

        /** Search crafting trees by normalized name. Returns result objects for the dropdown. */
        _searchCraftingTrees(q) {
            const qNorm = q.toLowerCase().replace(/[\s\-_.]/g, '');
            if (qNorm.length < 2) return [];
            const CRAFT_CHIP_LABELS = {
                device: 'app_craft_chip_device', equipment: 'app_craft_chip_equipment',
                repair: 'app_craft_chip_repair', upgrades: 'app_craft_chip_upgrades',
                medical: 'app_craft_chip_medical', ammo: 'app_craft_chip_ammo',
                artefact: 'app_craft_chip_artefact', furniture: 'app_craft_chip_furniture',
                decoration: 'app_craft_chip_decoration',
            };

            let candidates = [];

            if (this.craftingTrees.length) {
                // Trees already built — preferred, has full resolved data
                candidates = this.craftingTrees.map(tree => ({
                    id: tree.id,
                    name: tree.name,
                    displayName: this.t(tree.name),
                    craftCategory: tree.craftCategory,
                }));
            } else if (this.craftRecipes) {
                // craftRecipes loaded but trees not yet built — search raw recipe data
                for (const [cat, catData] of Object.entries(this.craftRecipes)) {
                    for (const r of catData.items || []) {
                        candidates.push({
                            id: r.id,
                            name: r.pda_encyclopedia_name,
                            displayName: this.t(r.pda_encyclopedia_name),
                            craftCategory: cat,
                        });
                    }
                }
            }

            return candidates
                .filter(c => c.displayName.toLowerCase().replace(/[\s\-_.]/g, '').includes(qNorm))
                .slice(0, 8)
                .map(c => ({
                    _craftingResult: true,
                    id: c.id,
                    treeName: c.name,
                    displayName: c.displayName,
                    craftCategory: c.craftCategory,
                    craftCategoryLabel: this.t(CRAFT_CHIP_LABELS[c.craftCategory] || 'app_craft_chip_all'),
                }));
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
                    exchangeSourceFilter: this.exchangeSourceFilter,
                    exchangeDirection: this.exchangeDirection,
                    exchangeView: this.exchangeView,
                    exchangeSort: this.exchangeSort,
                    includeAltAmmo: this.includeAltAmmo,
                });
            }

            const previousCategory = this.activeCategory;
            this.closeWeaponListPopover();

            this.buildPlannerActive = false;
            this.mapsActive = false;
            this.tradingActive = false;
            this.playerInventoryActive = false;
            this.damageSimActive = false;
            this.versionCompareActive = false;
            this.startingLoadoutsActive = false;
            this.factionPoolsActive = false;
            this.toolsLandingActive = false;
            this.favoritesViewActive = false;
            this.recentViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = cat;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.exchangeFactionFilter = null;
            this.exchangeSourceFilter = null;
            this.exchangeDirection = "give";
            this.exchangeView = "cards";
            this.exchangeSort = "name";
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
                    this.exchangeSourceFilter = saved.exchangeSourceFilter || null;
                    this.exchangeDirection = saved.exchangeDirection === "want" ? "want" : "give";
                    this.exchangeView = saved.exchangeView === "matrix" ? "matrix" : "cards";
                    this.exchangeSort = ["count", "gain"].includes(saved.exchangeSort) ? saved.exchangeSort : "name";
                    this.includeAltAmmo = saved.includeAltAmmo || false;
                }
            }
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();

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
                            this.categoryFuse[s] = new Fuse(r.items, {
                                keys: ["displayName", "pda_encyclopedia_name", "localeName", "id", "ui_ammo_types", "st_data_export_ammo_types_alt"],
                                threshold: 0.35,
                            });
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

            if (cat === CAT.CRAFTING) {
                this.startContentLoading();
                try {
                    // Load craft recipes and build artefact trees from the artefact category
                    const craftData = await this.fetchCraftRecipes();
                    if (craftData) {
                        this.craftRecipes = craftData;
                        if (this.craftingTrees.length === 0) {
                            this.buildCraftingTreeData(craftData);
                        }
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
                    console.error("Failed to load crafting data:", e);
                }
                await this.stopContentLoading();
                if (previousCategory !== CAT.CRAFTING) {
                    this.craftingTreeExpandAll = false;
                    this.craftingTreeExpanded = new Set();
                }
                return;
            }

            const slug = categorySlug(cat);
            if (this.categoryItems[slug]) {
                // Items may have been pre-cached (by loadItemById or All Weapons loader) without a
                // Fuse index — build it now so text filtering works on this category page.
                if (!this.categoryFuse[slug]) {
                    const items = this.categoryItems[slug];
                    for (const item of items) {
                        if (!item.localeName) item.localeName = this.tName(item);
                    }
                    this.categoryFuse[slug] = new Fuse(items, {
                        keys: ["displayName", "pda_encyclopedia_name", "localeName", "id", "ui_ammo_types", "st_data_export_ammo_types_alt"],
                        threshold: 0.35,
                    });
                }
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

        async openItem(id, scrollTarget = 0) {
            const entry = this.index.find((i) => i.id === id);
            if (!entry) {
                history.replaceState(null, "", window.location.pathname + window.location.search);
                return;
            }

            this.hideItemHover();
            this.closeWeaponListPopover();

            try {
                this.addRecent(id);

                this.modalCategory = entry.category;
                const slug = categorySlug(entry.category);

                await this.ensureCategoryLoaded(slug);

                this.modalHeaders = this.categoryHeaders[slug];
                this.modalItem = this.categoryItems[slug].find((i) => i.id === id);

                // Show modal only after item data is ready to avoid a loading flash
                this.modalLoading = false;
                this.modalOpen = true;
                this.modalDrops = null;
                this.modalItemDrops = null;
                this.modalStashChance = null;
                this.modalSoldBy = null;
                this.modalRecipeData = null;
                this.modalDisassemble = null;
                this.modalUpgradeNodes = null;
                this.modalAmmoWeapons = null;
                this._ammoDecCache = {};
                this.copyIdFeedback = false;
                this.copyModalLinkFeedback = false;
                this.crossPackItem = null;
                this.crossPackNotFound = false;
                document.body.style.overflow = "hidden";

                const isWeapon = WEAPON_CATEGORIES.includes(entry.category);
                const [drops, itemDrops, stashChance, recipeData, disassemble, ammoWeapons, upgrades, soldBy] = await Promise.all([
                    this.fetchDrops(),
                    this.fetchItemDrops(),
                    this.fetchStashChance(),
                    this.fetchRecipes(),
                    this.fetchDisassemble(),
                    this.fetchAmmoWeapons(),
                    this.fetchUpgrades(),
                    this.fetchSoldBy(),
                    this.fetchTradersMeta(),
                    this.fetchItemParts(),
                    this.fetchItemPartDefs(),
                    isWeapon ? this.ensureCategoryLoaded(categorySlug(CAT.AMMO)) : Promise.resolve(),
                    isWeapon ? this.ensureCategoryLoaded(categorySlug(CAT.SCOPES)) : Promise.resolve(),
                    isWeapon ? this.fetchWeaponAddons() : Promise.resolve(),
                    isWeapon ? this.ensureCategoryLoaded(categorySlug(CAT.SILENCERS)) : Promise.resolve(),
                    isWeapon ? this.ensureCategoryLoaded(categorySlug(CAT.GRENADE_LAUNCHERS)) : Promise.resolve(),
                    isWeapon ? this.ensureCategoryLoaded(categorySlug(CAT.TACTICAL_KITS)) : Promise.resolve(),
                    isWeapon && this.showMagazines ? this.ensureCategoryLoaded(categorySlug(CAT.MAGAZINES)) : Promise.resolve(),
                    isWeapon && this.showMagazines ? this.fetchWeaponMagazines() : Promise.resolve(),
                    // Magazine modal: reverse lookup needs the weapon→magazine map (weapons resolve from index).
                    entry.category === CAT.MAGAZINES && this.showMagazines ? this.fetchWeaponMagazines() : Promise.resolve(),
                ]);
                this.modalDrops = drops[id] || null;
                this.modalItemDrops = itemDrops[id] || null;
                this.modalStashChance = stashChance[id] || null;
                this.modalRecipeData = recipeData;
                this.modalDisassemble = disassemble[id] || null;
                this.modalUpgradeNodes = upgrades[id] || null;
                this.modalAmmoWeapons = ammoWeapons[id] || null;
                this.modalSoldBy = soldBy[id] || null;

                // For addon items (scopes/silencers/grenade launchers), pre-fetch compatible
                // weapon category data so the modal can show rich stat tooltips on each weapon.
                if ([CAT.SCOPES, CAT.SILENCERS, CAT.GRENADE_LAUNCHERS, CAT.TACTICAL_KITS].includes(entry.category)) {
                    await this.fetchWeaponAddons();
                    if (entry.category === CAT.TACTICAL_KITS) await this.fetchKitWeapons();
                    const weaponIds = [
                        ...(this.addonCompatibleWeaponsMap[id] || []),
                        ...(entry.category === CAT.TACTICAL_KITS ? (this.kitWeaponsCache?.[id] || []) : []),
                    ];
                    if (weaponIds.length) {
                        const idxMap = new Map(this.index.map(i => [i.id, i]));
                        const slugsToLoad = [...new Set(
                            weaponIds.map(wid => {
                                const we = idxMap.get(wid);
                                return we ? categorySlug(we.category) : null;
                            }).filter(Boolean)
                        )].filter(s => !this.categoryItems[s]);
                        await Promise.all(slugsToLoad.map(async s => {
                            try {
                                const res = await fetch(this.dataUrl(`${s}.json`));
                                if (!res.ok) throw new Error(`HTTP ${res.status} for ${s}.json`);
                                const data = await res.json();
                                this.categoryItems[s] = data.items;
                                this.categoryHeaders[s] = data.headers;
                            } catch (e) { console.warn(`Failed to load category data for "${s}":`, e); }
                        }));
                    }
                }

                // Ammo modal: the "Used By" tiles show a stat hover card, which needs the
                // full weapon rows rather than the slim ammo-weapons entries.
                if (entry.category === CAT.AMMO && this.modalAmmoWeapons?.length) {
                    const slugs = [...new Set(this.modalAmmoWeapons.map(w => w.category).filter(Boolean).map(categorySlug))];
                    await Promise.all(slugs.map(s => this.ensureCategoryItems(s)));
                }
            } catch (e) {
                console.error("Failed to load item:", e);
            }
            this.modalLoading = false;
            if (this.crossPackId) this.loadCrossPackItem(this.crossPackId);
            // Position the scroll once all sections are populated: top for a fresh
            // open, or the saved offset when Back/Forward passes one through.
            this._restoreModalScroll(scrollTarget);
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
            this._modalNavBackStack = [];
            this._modalNavFwdStack = [];
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
            this.versionCompareFilter = "";
            this.versionComparePropertyFilter = [];
            this.versionCompareCategoryFilter = [];
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

        openToolsLanding() {
            this.resetViewState();
            this.toolsLandingActive = true;
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
        },

        // Resolve the loadout JSON for the active mod, falling back to the base file
        // when no mod is selected or the selected one isn't in this pack's manifest.
        loadoutFileName() {
            const id = this.activeLoadoutMod;
            if (id && this.loadoutMods.includes(id)) return `starting-loadouts-${id}.json`;
            return "starting-loadouts.json";
        },

        async openStartingLoadouts() {
            this.resetViewState();
            this.startingLoadoutsActive = true;
            this.pushUrlState(true);
            // Null the cache first so a mod change re-fetches the right file.
            this.startingLoadoutsCache = null;
            await this.fetchJsonCached("startingLoadoutsCache", this.loadoutFileName());
        },

        setLoadoutMod(id) {
            this.activeLoadoutMod = id || "";
            try { localStorage.setItem("activeLoadoutMod", this.activeLoadoutMod); } catch {}
            // If the loadout screen is open, re-fetch so the swap is immediate.
            if (this.startingLoadoutsActive) {
                this.startingLoadoutsCache = null;
                this.fetchJsonCached("startingLoadoutsCache", this.loadoutFileName());
            }
        },

        async openFactionPools() {
            this.resetViewState();
            this.factionPoolsActive = true;
            this.pushUrlState(true);
            const drops = await this.fetchDrops();
            // Preload category data for pool weapons so the origin filter has
            // each weapon's factions[] (origin) available
            if (drops) {
                const slugs = new Set();
                for (const id of Object.keys(drops)) {
                    const entry = this.indexById[id];
                    if (entry) slugs.add(categorySlug(entry.category));
                }
                await Promise.all([...slugs].map((slug) => this.ensureCategoryItems(slug)));
            }
        },

        async ensureCategoryItems(slug) {
            if (this.categoryItems[slug]) return;
            try {
                const res = await fetch(this.dataUrl(`${slug}.json`));
                const data = await res.json();
                if (this.categoryItems[slug]) return;
                for (const item of data.items) item.localeName = this.tName(item);
                this.categoryItems[slug] = data.items;
                this.categoryHeaders[slug] = data.headers;
            } catch (e) {
                console.warn(`Failed to load category data for ${slug}:`, e);
            }
        },

        async loadoutItemHover(id, event, extras) {
            const entry = this.indexById[id];
            if (!entry) return;
            // currentTarget is cleared once dispatch ends, so capture the anchor
            // before the category fetch below can await past it — otherwise the
            // first hover on a not-yet-loaded category has nothing to anchor to
            // and the popover renders off-screen.
            const anchor = { currentTarget: event.currentTarget };
            const slug = categorySlug(entry.category);
            if (!this.categoryItems[slug]) {
                try {
                    const res = await fetch(this.dataUrl(`${slug}.json`));
                    const data = await res.json();
                    for (const item of data.items) item.localeName = this.tName(item);
                    this.categoryItems[slug] = data.items;
                    this.categoryHeaders[slug] = data.headers;
                } catch { return; }
            }
            const item = (this.categoryItems[slug] || []).find(i => i.id === id);
            if (item) this.showItemHover(item, anchor, null, extras);
        },

        async loadVersionCompareData() {
            if (!this.crossPackId) { this.versionCompareResults = []; this.versionComparePropertyFilter = []; this.versionCompareCategoryFilter = []; this.versionCompareFilter = ""; return; }
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

            // History-based back/forward for cross-category navigation. navigateToItem
            // saves/restores scroll via _modalScrollById, so the stacks only track order.
            if (direction === -1 && this._modalNavBackStack.length > 0) {
                const prevId = this._modalNavBackStack.pop();
                this._modalNavFwdStack.push(this.modalItem.id);
                this.navigateToItem(prevId, true);
                return;
            }
            if (direction === 1 && this._modalNavFwdStack.length > 0) {
                const nextId = this._modalNavFwdStack.pop();
                this._modalNavBackStack.push(this.modalItem.id);
                this.navigateToItem(nextId, true);
                return;
            }

            // Fallback: navigate within the current sorted list
            let items;
            if (this.versionCompareActive) {
                items = this.filteredVersionCompareResults.flatMap(g => g.items);
            } else if (this.isCrafting) {
                items = this.filteredCraftingTrees;
            } else {
                items = this.sortedItems;
            }
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
            this.mapsActive = false;
            this.tradingActive = false;
            this.playerInventoryActive = false;
            this.damageSimActive = false;
            this.versionCompareActive = false;
            this.startingLoadoutsActive = false;
            this.factionPoolsActive = false;
            this.toolsLandingActive = false;
            this.favoritesViewActive = false;
            this.recentViewActive = false;
            this.showFavoritesOnly = false;
            this.activeCategory = null;
            this.filterQuery = "";
            this.filterInput = "";
            this.sortCol = "pda_encyclopedia_name";
            this.sortAsc = true;
            this.activeFilters = {};
            this.versionCompareFilter = "";
            this.versionComparePropertyFilter = [];
            this.versionCompareCategoryFilter = [];
            if (this.$refs.filterBar) this.$refs.filterBar.closeFilterPanel();
            this.sidebarOpen = false;
        },

        openItemDb() {
            const cat = (this.activeCategory && this.activeCategory !== CAT.CRAFTING) ? this.activeCategory : (this.groupedCategories.length && this.groupedCategories[0].categories[0]);
            if (cat) this.selectCategory(cat);
        },

        openMaps() {
            this.resetViewState();
            this.mapsActive = true;
            this.mapsMounted = true;
            this.pushUrlState(true);
        },

        openTrading() {
            this.resetViewState();
            this.tradingActive = true;
            this.tradingMounted = true;
            this.pushUrlState(true);
        },

        openPlayerInventory() {
            this.resetViewState();
            this.playerInventoryActive = true;
            this.playerInventoryMounted = true;
            this.ensureLoadoutData();
            if (!this.playerInventoryParseResult) this.loadPlayerInventoryFromStorage();
            this.pushUrlState(true);
        },

        openCrafting() {
            this.selectCategory(CAT.CRAFTING);
        },

        setCraftingGraphView(val) {
            this.craftingGraphView = val;
            try { localStorage.setItem("craftingTreesView", val ? "tree" : "tile"); } catch {}
        },

        toggleCraftingExpand() {
            if (this.craftingGraphView) {
                this._craftingTreeViewExpandAll = !this._craftingTreeViewExpandAll;
            } else {
                if (this.craftingTreeExpandAll) this.collapseAllTrees();
                else this.expandAllTrees();
            }
        },

        selectCraftingCategory(key) {
            this.craftingCategory = key;
            this.activeFilters = {};
            this.filterQuery = "";
            this.filterInput = "";
            this.sidebarOpen = false;
            this.pushUrlState(true);
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

        // Open the comparison modal for an explicit set of ids (e.g. the player
        // inventory's multi-select), without disturbing the user's pinned items.
        async compareSelectedItems(ids) {
            const unique = [...new Set(ids)].slice(0, MAX_PINS);
            if (unique.length < 2) return;
            this.compareOpen = true;
            this.compareData = [];
            document.body.style.overflow = "hidden";

            const results = await Promise.all(unique.map((id) => this.loadItemById(id)));
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

            const hexToRgba = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r},${g},${b},${alpha})`;
            };

            const self = this;
            const categories = this.compareData.map(e => e.category);
            const isMutantParts = categories.every(c => c === CAT.MUTANT_PARTS);
            const isAddonCat = categories.every(c => c === CAT.SCOPES || c === CAT.SILENCERS || c === CAT.GRENADE_LAUNCHERS || c === CAT.TACTICAL_KITS);

            // Addon categories (Scopes/Silencers/Grenade Launchers): use a horizontal bar chart with real values
            if (isAddonCat) {
                const labels = fields.map(f => this.headerLabel(f));
                const datasets = this.compareData.map((entry, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return {
                        label: this.tName(entry.item),
                        data: fields.map(f => {
                            const n = parseFloat(String(entry.item[f] ?? "").replace("%", ""));
                            return isNaN(n) ? 0 : n;
                        }),
                        backgroundColor: hexToRgba(color, 0.75),
                        borderColor: color,
                        borderWidth: 1,
                    };
                });
                this._compareChart = new Chart(canvas, {
                    type: "bar",
                    data: { labels, datasets },
                    options: {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 1.6,
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: { color: "#b0b0b0", font: { size: 11 } },
                                grid: { color: "#2a2a2a" },
                            },
                            y: {
                                ticks: { color: "#d4d4d4", font: { size: 12 } },
                                grid: { color: "#2a2a2a" },
                            },
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
                return;
            }

            // Mutant parts: use a grouped bar chart (actual price values) instead of radar
            if (isMutantParts) {
                const labels = fields.map(f => this.headerLabel(f));
                const datasets = this.compareData.map((entry, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return {
                        label: this.tName(entry.item),
                        data: fields.map(f => {
                            const n = parseFloat(String(entry.item[f] ?? "").replace("%", ""));
                            return isNaN(n) ? 0 : n;
                        }),
                        backgroundColor: hexToRgba(color, 0.75),
                        borderColor: color,
                        borderWidth: 1,
                    };
                });
                this._compareChart = new Chart(canvas, {
                    type: "bar",
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            x: {
                                ticks: { color: "#d4d4d4", font: { size: 12 } },
                                grid: { color: "#2a2a2a" },
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: "#b0b0b0", font: { size: 11 } },
                                grid: { color: "#2a2a2a" },
                            },
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
                return;
            }

            // Use full category ranges so items are positioned relative to all items in the category
            const catRanges = {};
            const seenCategories = new Set(categories);
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
            const fields = [...this.weaponStatFields, AP_FIELD];
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
            let high = null;
            let low = null;
            if (numerics.length >= 2 && !NO_HIGHLIGHT.has(label)) {
                const maxVal = Math.max(...numerics);
                const minVal = Math.min(...numerics);
                if (maxVal !== minVal) {
                    const lowerBetter = LOWER_IS_BETTER.has(label) || HIGHER_IS_WORSE.has(label);
                    best = lowerBetter ? minVal : maxVal;
                    worst = lowerBetter ? maxVal : minVal;
                    high = maxVal;
                    low = minVal;
                }
            }
            return { label, values, parsed, best, worst, high, low };
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
            if (row.high === null) return "";
            const v = row.parsed[idx];
            if (isNaN(v)) return "";
            if (v === row.high) return "\u25B2";
            if (v === row.low) return "\u25BC";
            return "";
        },

        buildCraftingTreeData(craftData) {
            // Build a recipe map from ALL categories so cross-category ingredient resolution works
            const allRecipes = [];
            const recipeMap = {};
            for (const key of Object.keys(craftData)) {
                for (const r of craftData[key].items) {
                    r._craftCategory = key;
                    recipeMap[r.pda_encyclopedia_name] = r;
                    allRecipes.push(r);
                }
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
            // Build trees for every recipe
            this.craftingTrees = allRecipes.map(r => {
                const tree = buildNode(r.pda_encyclopedia_name, "x1", new Set());
                tree.id = r.id;
                tree.toolTier = r.toolTier;
                tree.recipeReqName = r.recipeReqName;
                tree.craftCategory = r._craftCategory;
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
            const cols = [{ key: 'id', label: 'ID' }];
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
                if (col.key === 'id') return item.id || '';
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
                    // Virtual: grenade launcher availability check
                    if (key === "_has_launcher") {
                        const addons = this.weaponAddonsCache ? (this.weaponAddonsCache[item.id] || null) : null;
                        const hasLauncher = !!(addons && addons.launchers && addons.launchers.length > 0);
                        if (val === true && !hasLauncher) return false;
                        if (val === false && hasLauncher) return false;
                        continue;
                    }
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
                    } else if (def.type === "present" && val === true) {
                        if (!item[key]) return false;
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
                        } else if (def.multiValue) {
                            // ";"-joined scalar list (e.g. fire modes "1;3;A") — match on any selected token
                            const tokens = String(itemVal || "").split(";").map(s => s.trim()).filter(Boolean);
                            if (!val.some(v => tokens.includes(v))) return false;
                        } else if (def.arrayField) {
                            if (!Array.isArray(itemVal) || !val.some(v => itemVal.includes(v))) return false;
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
            if (def.format) return def.format(value);
            if (def.labelMap && def.labelMap[value]) return this.t(def.labelMap[value]);
            if (def.translate) return this.t(value);
            if (def.displayMap && def.displayMap[value]) return def.displayMap[value];
            const entry = this.displayEntry(def.key, value);
            if (entry) { const lbl = typeof entry === 'string' ? entry : entry.label || value; return this.t(lbl); }
            if (def.key === "ui_ammo_types") return this.caliberName(value);
            if (def.key === "st_data_export_fire_modes") return this.fireModeLabel(value);
            return this.t(value);
        },

        toggleHideNoDrop() {
            this.hideNoDrop = !this.hideNoDrop;
            localStorage.setItem("hideNoDrop", JSON.stringify(this.hideNoDrop));
        },

        toggleShowUnreliableStats() {
            this.showUnreliableStats = !this.showUnreliableStats;
            try { localStorage.setItem("showUnreliableStats", this.showUnreliableStats ? "1" : ""); } catch {}
        },

        toggleShowEngineUpgradeStats() {
            this.showEngineUpgradeStats = !this.showEngineUpgradeStats;
            try { localStorage.setItem("showEngineUpgradeStats", this.showEngineUpgradeStats ? "1" : "0"); } catch {}
        },

        toggleHideTacticalKit() {
            this.hideTacticalKit = !this.hideTacticalKit;
            localStorage.setItem("hideTacticalKit", JSON.stringify(this.hideTacticalKit));
        },

        toggleHideUnusedAmmo() {
            this.hideUnusedAmmo = !this.hideUnusedAmmo;
            localStorage.setItem("hideUnusedAmmo", JSON.stringify(this.hideUnusedAmmo));
        },

        toggleShowTileIcons() {
            this.showTileIcons = !this.showTileIcons;
            localStorage.setItem("showTileIcons", JSON.stringify(this.showTileIcons));
        },

        // Build the sidebar groups from the loaded categories. Magazines is gated
        // behind the opt-in showMagazines pref; everything else shows when present
        // (or, for virtual categories, when derivable).
        buildGroupedCategories() {
            const catSet = new Set(this.categories);
            this.groupedCategories = CATEGORY_GROUPS
                .map((g) => ({
                    name: g.name,
                    categories: g.categories.filter((c) =>
                        c === CAT.MAGAZINES
                            ? (catSet.has(c) && this.showMagazines)
                            : (catSet.has(c) || (VIRTUAL_CATEGORIES.has(c) && this.isVirtualCategoryAvailable(c)))
                    ),
                }))
                .filter((g) => g.categories.length > 0);
        },

        toggleShowMagazines() {
            this.showMagazines = !this.showMagazines;
            try { localStorage.setItem("showMagazines", this.showMagazines ? "1" : ""); } catch {}
            this.buildGroupedCategories();
            // If we just hid the category we're viewing, fall back to a valid one.
            if (!this.showMagazines && this.activeCategory === CAT.MAGAZINES) {
                const first = this.groupedCategories[0]?.categories[0];
                if (first) this.selectCategory(first);
            }
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
            return this.exchangeIdByName[name] || null;
        },

        // Translate a string that carries {placeholders}, e.g. "{n} traders".
        tf(key, params) {
            let out = this.t(key);
            for (const [k, v] of Object.entries(params || {})) {
                out = out.split("{" + k + "}").join(v);
            }
            return out;
        },

        navigateToItem(id, _fromHistory = false) {
            if (!this.indexById[id]) return;
            // Snapshot where we're leaving so a later return restores it.
            this._saveCurrentModalScroll();
            if (!_fromHistory && this.modalOpen && this.modalItem) {
                this._modalNavBackStack.push(this.modalItem.id);
                this._modalNavFwdStack = [];
            }
            // Returning to a previously seen item (in-modal arrows or browser
            // Back/Forward) restores its saved scroll; opening a new one starts at top.
            const target = _fromHistory ? (this._modalScrollById[id] || 0) : 0;
            this.openItem(id, target);
            history.pushState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
        },

        // The modal body (.modal-body) is the scroll container; it persists across
        // in-modal navigation, so scrollTop must be set explicitly each time.
        _getModalScroll() {
            const el = document.querySelector(".modal-body");
            return el ? el.scrollTop : 0;
        },
        _saveCurrentModalScroll() {
            if (this.modalOpen && this.modalItem) {
                this._modalScrollById[this.modalItem.id] = this._getModalScroll();
            }
        },
        _restoreModalScroll(top) {
            const target = top || 0;
            // The modal's sections (parts, upgrade tree, drops, images) settle over
            // a few frames after the data lands. Setting scrollTop once can clamp to a
            // not-yet-tall-enough max and lose the offset, so re-apply each frame until
            // it sticks (or we run out of tries). Stops immediately for target 0.
            this.$nextTick(() => {
                let frames = 0;
                const apply = () => {
                    const el = document.querySelector(".modal-body");
                    if (!el) return;
                    el.scrollTop = target;
                    if (++frames < 12 && Math.abs(el.scrollTop - target) > 1) {
                        requestAnimationFrame(apply);
                    }
                };
                requestAnimationFrame(apply);
            });
        },
        // Keep the current item's saved scroll fresh as the user scrolls, so the
        // browser's Back/Forward (which goes through hashchange, not the in-modal
        // arrows) restores the right offset. Debounced to avoid per-frame work.
        onModalScroll() {
            clearTimeout(this._scrollSyncTimer);
            this._scrollSyncTimer = setTimeout(() => this._saveCurrentModalScroll(), 80);
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
            if (h === "_ballistic_rating") return this.t("_ballistic_rating");
            if (h === "_cost_per_round") return this.t("_cost_per_round");
            if (h === "_compatible_weapons") return this.t("app_label_compatible_weapons");
            if (h === "_num_scopes") return this.t("app_label_num_scopes");
            if (h === "_mag_capacity") return this.t("app_label_mag_capacity");
            if (h === "magSize") return this.t("app_label_mag_size");
            if (h === "magRounds") return this.t("app_label_mag_rounds");
            if (h === "factions") return this.t("app_filter_origin");
            if (h === "st_upgr_cost" && this.activeCategory === CAT.AMMO) return this.t("_cost_per_pack");
            if (h === "ui_inv_damage" && this.activeCategory === CAT.AMMO) return this.t("st_data_export_damage_mult");
            const translated = this.t(h);
            if (translated !== h) return translated;
            return h;
        },

        isLeftAlignCol(key) {
            const LEFT_COLS = ['pda_encyclopedia_name', 'name', 'ui_st_community', 'ui_ammo_types', 'st_data_export_ammo_types_alt', 'factions'];
            return LEFT_COLS.includes(key);
        },

        originBadge(factions) {
            if (!Array.isArray(factions) || factions.length === 0) return null;
            const ORDER = ['wp', 'nato', 'other'];
            const labelOf = f => f === 'nato' ? 'NATO' : f === 'wp' ? 'WP' : this.t('app_origin_other').toUpperCase();
            if (factions.length === 1) {
                return { cls: 'badge-origin-' + factions[0], label: labelOf(factions[0]) };
            }
            const sorted = [...factions].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
            return { cls: 'badge-origin-mixed', label: sorted.map(labelOf).join('/') };
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
            if ([CAT.SCOPES, CAT.SILENCERS, CAT.GRENADE_LAUNCHERS, CAT.TACTICAL_KITS].includes(category) && !allHeaders.includes("_compatible_weapons")) {
                allHeaders.push("_compatible_weapons");
            }
            if ((category === CAT.OUTFITS || category === CAT.HELMETS) && !allHeaders.includes("_ballistic_rating")) {
                allHeaders.push("_ballistic_rating");
            }
            const isWeapon = WEAPON_CATEGORIES.includes(category) || category === CAT.ALL_WEAPONS;
            if (isWeapon && this.weaponAddonsCache && !allHeaders.includes("_num_scopes")) {
                allHeaders.push("_num_scopes");
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
                if (key === "ui_inv_wrange" && String(val).includes("%")) {
                    const dec = this.ammoColDecimals("ui_inv_wrange");
                    const baseRange = parseFloat(wpn["ui_inv_wrange"]);
                    if (!baseRange) return `${pct.toFixed(dec.raw)}%`;
                    const eff = Math.round(baseRange * pct / 100);
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
            if (field === "_ballistic_rating") {
                const r = ballisticRating(item.boneArmor, item.hitFractionActor);
                return r === null ? undefined : r;
            }
            if (field === "_cost_per_round") {
                const cost = parseFloat(item["st_upgr_cost"]);
                const box = parseFloat(item["st_data_export_ammo_box_size"]);
                if (isNaN(cost) || isNaN(box) || box === 0) return undefined;
                return cost / box;
            }
            if (field === "_compatible_weapons") {
                let weapons = (this.addonCompatibleWeaponsMap || {})[item.id] || [];
                if ((this.hideNoDrop || this.hideTacticalKit) && weapons.length) {
                    const indexMap = new Map((this.index || []).map(i => [i.id, i]));
                    weapons = weapons.filter(wid => {
                        const w = indexMap.get(wid);
                        return w && !(this.hideNoDrop && w.unobtainable === true) && !(this.hideTacticalKit && w.tacticalKit === true);
                    });
                }
                return weapons.length;
            }
            if (field === "_num_scopes") {
                const addons = (this.weaponAddonsCache || {})[item.id];
                return addons ? addons.scopes.length : 0;
            }
            if (field === "_mag_capacity") {
                const c = item.magCapacity;
                return c ? `${c.small} / ${c.medium} / ${c.large}` : undefined;
            }
            if (field === "ui_ammo_count") {
                // The exported mag size is the value the game reported in-panel — under the
                // optional GAMMA Mags Reloaded mod that's the loaded default-mag capacity
                // (e.g. P90 gamma 75), not the weapon's native size. Prefer the native
                // ammo_mag_size (base_mag_size) when the Magazines view is off, OR whenever
                // the Mags value is missing/0 — a few weapons (GSh-18, ACE 21) spawn without
                // a mag attached at export and report 0, which is never a valid mag size.
                // Falls back to ui_ammo_count for data pre-dating base_mag_size.
                const mags = parseFloat(item.ui_ammo_count);
                const base = parseFloat(item.base_mag_size);
                if ((!this.showMagazines || !(mags > 0)) && base > 0) return item.base_mag_size;
                return item.ui_ammo_count;
            }
            return item[field];
        },

        formatValue(h, val, tableMode) {
            if (val === undefined || val === null || val === "" || val === "--") return "--";
            if (h === "_malfunction_chance") return val.toFixed(2) + "%";
            if (h === "_ballistic_rating") return Math.round(val) + "%";
            // Belt contributions read as deltas to the wearer's armour, so sign them.
            if (h === "st_data_export_belt_br_class" || h === "st_data_export_belt_stopped_bonus") {
                const n = parseFloat(val);
                if (isNaN(n)) return String(val);
                const unit = h === "st_data_export_belt_stopped_bonus" ? "%" : "";
                return (n > 0 ? "+" : "") + n + unit;
            }
            if (h === "_cost_per_round") {
                const n = parseFloat(val);
                return isNaN(n) ? String(val) : `${n.toLocaleString(this.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ₽`;
            }
            if (h === "st_upgr_cost") {
                const n = parseFloat(val);
                return isNaN(n) ? String(val) : `${n.toLocaleString(this.locale)} ₽`;
            }
            if (h === "_compatible_weapons") return String(val);
            if (h === "_num_scopes") return String(val);
            if (h === "_mag_capacity") return String(val);
            if (h === "magSize") {
                const key = "app_mag_size_" + String(val).toLowerCase();
                const label = this.t(key);
                return label !== key ? label : String(val);
            }
            if (h === "ui_ammo_types" || h === "st_data_export_ammo_types_alt") return this.caliberName(val);
            // Spelled out for every consumer without a dedicated badge branch
            // (item grid, hover popover, compare panel, build planner, ...).
            // ItemTable and ItemDetailModal render glyph chips instead.
            if (h === "st_data_export_fire_modes") {
                return this.fireModes(val).map(m => this.fireModeLabelShort(m)).join(" / ");
            }
            if (h === "ui_st_community") return this.t(val);
            if (h === "st_data_export_zoom_factor") return `${val}x`;
            if (h === "st_data_export_magnifications") {
                // "3-10" → "3–10x" (variable range); "1,4" → "1x/4x" (discrete modes, e.g. SpecterDR)
                const mag = String(val);
                if (mag.includes(",")) return mag.split(",").map(v => v.trim() + "x").join("/");
                return `${mag.replace(/-/g, "–")}x`;
            }

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
            return name
                .replace(/\s*(rounds?|shells|slugs|cartridge)$/i, "")
                .replace(/\bBuckshot\b/i, "Buck")
                .replace(/\bHome-made\b/i, "HM")
                .replace(/\bHydra-shock HP\b/i, "Hydra-shock")
                .replace(/[""]/g, "")
                .replace(/^Патроны\s*/i, "")
                .replace(/\s*мм\b/i, "")
                .replace(/\s*mm\b/i, "")
                .replace(/\bPst\b/, "PST")
                .trim();
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
            if (cpr != null) chips.push(`<span class='ammo-tooltip-chip ammo-tooltip-chip-cost'>Cost/Round ${this.escapeHtml(this.formatValue('_cost_per_round', cpr))}</span>`);

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

        addonCompatibleWeaponsTooltip(item) {
            if (!item) return '';
            const esc = this.escapeHtml;
            // Deduplicate weapon IDs (same weapon can appear multiple times in addon map)
            const weaponIds = [...new Set((this.addonCompatibleWeaponsMap || {})[item.id] || [])];
            const title = esc(this.t('app_label_compatible_weapons'));
            if (!weaponIds.length) {
                return {
                    className: 'tooltip-addon-weapons-card',
                    html: `<div class="addon-compat-tooltip"><div class="addon-compat-title">${title}</div><div class="addon-compat-none">${esc(this.t('app_label_no_compatible_weapons'))}</div></div>`,
                };
            }
            const MAX_SHOWN = 20;
            const indexMap = new Map(this.index.map(i => [i.id, i]));
            // Translate, deduplicate names, then sort
            const allNames = [...new Set(
                weaponIds.map(wid => {
                    const weapon = indexMap.get(wid) || { id: wid, pda_encyclopedia_name: wid };
                    return esc(this.tName(weapon).replace(/\s*\[default\]$/i, '').trim());
                })
            )].sort((a, b) => a.localeCompare(b));
            const shown = allNames.slice(0, MAX_SHOWN);
            const extra = allNames.length - shown.length;
            const countLabel = `<span class="addon-compat-count">(${allNames.length})</span>`;
            const items = shown.map(n => `<div class="addon-compat-weapon">${n}</div>`).join('');
            const moreInDetail = this.t('app_label_more_in_detail');
            const moreLabel = extra > 0
                ? `<div class="addon-compat-more">+${extra} ${esc(moreInDetail === 'app_label_more_in_detail' ? 'more · open detail for full list' : moreInDetail)}</div>`
                : '';
            return {
                className: 'tooltip-addon-weapons-card',
                html: `<div class="addon-compat-tooltip"><div class="addon-compat-title">${title} ${countLabel}</div><div class="addon-compat-list">${items}</div>${moreLabel}</div>`,
            };
        },

        showWeaponListPopover(item, event) {
            clearTimeout(this._weaponListHideTimeout);
            clearTimeout(this._weaponListShowTimeout);
            const anchor = event.currentTarget;
            if (this.weaponListPopoverItem?.id === item.id) return;
            this._weaponListShowTimeout = setTimeout(() => {
                this.weaponListPopoverItem = item;
                this.$nextTick(() => {
                    const el = document.querySelector('.weapon-list-popover');
                    if (!el || !anchor) return;
                    FloatingUIDOM.computePosition(anchor, el, {
                        placement: 'bottom-start',
                        strategy: 'fixed',
                        middleware: [
                            FloatingUIDOM.offset(4),
                            FloatingUIDOM.flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }),
                            FloatingUIDOM.shift({ padding: 8 }),
                        ],
                    }).then(({ x, y }) => {
                        this.weaponListPopoverPos = { top: y, left: x };
                    });
                });
            }, 300);
        },

        hideWeaponListPopover() {
            clearTimeout(this._weaponListShowTimeout);
            this._weaponListHideTimeout = setTimeout(() => {
                this.weaponListPopoverItem = null;
                this.weaponListPopoverPos = null;
            }, 150);
        },

        keepWeaponListPopover() {
            clearTimeout(this._weaponListHideTimeout);
        },

        closeWeaponListPopover() {
            clearTimeout(this._weaponListShowTimeout);
            clearTimeout(this._weaponListHideTimeout);
            this.weaponListPopoverItem = null;
            this.weaponListPopoverPos = null;
        },

        showItemHoverFromCaliber(caliberId, event) {
            // Skip on touch devices: tapping an ammo badge already opens the item,
            // so the hover preview is redundant and would render offscreen.
            if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
            const cal = (caliberId || "").trim();
            if (!cal) return;
            const entry = this.calibers[cal];
            if (!entry || !entry.variants?.length) return;
            const variant = entry.variants[0];
            if (!variant) return;
            const full = this.ammoItemById(variant.id);
            this.showItemHover(full || variant, event);
        },

        showItemHover(item, event, compareItem, extras) {
            clearTimeout(this._hoverShowTimeout);
            // Every trigger for this popover navigates on tap, so on touch we let the
            // tap open the item. (A drawer would also swallow the delayed synthetic
            // click on real devices, blocking navigation entirely.)
            if (prefersTouchHover()) return;
            this._hoverAnchor = event.currentTarget || null;
            this._hoverShowTimeout = setTimeout(() => {
                this.hoverItem = item;
                this.hoverCompareItem = compareItem || null;
                this.hoverExtras = extras || null;
                this.$nextTick(() => this._positionHoverPopover());
            }, 250);
        },

        moveItemHover() {
            // Anchored popovers stay put — autoUpdate tracks resize/scroll.
        },

        hideItemHover() {
            clearTimeout(this._hoverShowTimeout);
            if (this._hoverCleanup) { this._hoverCleanup(); this._hoverCleanup = null; }
            this._hoverAnchor = null;
            this.hoverItem = null;
            this.hoverPos = null;
            this.hoverCompareItem = null;
            this.hoverExtras = null;
        },

        _positionHoverPopover() {
            const el = document.querySelector('.item-hover-popover-global') || document.querySelector('.item-compare-popover');
            if (!el || !this._hoverAnchor) return;
            if (this._hoverCleanup) { this._hoverCleanup(); this._hoverCleanup = null; }
            this._hoverCleanup = attachHoverPosition(this._hoverAnchor, el, (pos) => { this.hoverPos = pos; });
        },

        navHref(page) {
            const pack = this.activePack?.id;
            if (!pack) return '/';
            if (!page || page === 'db') return `/db/${pack}`;
            return `/db/${pack}/${page}`;
        },

        itemHref(itemId) {
            const pack = this.activePack?.id;
            if (!pack) return '#';
            return `/db/${pack}#${itemId}`;
        },

        itemExists(itemId) {
            if (!itemId) return false;
            return this.index?.some(i => i.id === itemId) ?? false;
        },

        categoryHref(category) {
            return this.navHref(categorySlug(category));
        },

        craftingHref(subcat) {
            return this.navHref(subcat);
        },

        // Fire mode tokens are the in-game HUD glyphs: "1" single, "A" full auto,
        // any other number an N-round burst. Returns the spelled-out name for
        // tooltips and filter chips; the badge itself shows the raw glyph.
        fireModeLabel(mode) {
            const m = String(mode).trim();
            if (m === "A") return this.t("app_fire_mode_auto");
            if (m === "1") return this.t("app_fire_mode_single");
            return this.t("app_fire_mode_burst").replace("%s", m);
        },

        // Compact form for stat values, where "Single shot, 3-round burst, Full
        // auto" is too long. The full names stay on badge tooltips and in the
        // filter list, which have room to be explicit.
        fireModeLabelShort(mode) {
            const m = String(mode).trim();
            if (m === "A") return this.t("app_fire_mode_auto_short");
            if (m === "1") return this.t("app_fire_mode_single_short");
            return this.t("app_fire_mode_burst_short").replace("%s", m);
        },

        // Sorted into the canonical HUD order — burst counts ascending, auto last.
        // A few weapons (wpn_sr25) list their modes the other way round in the ltx.
        fireModes(val) {
            if (!val) return [];
            return String(val).split(";").map(s => s.trim()).filter(Boolean)
                .sort((a, b) => (a === "A" ? 1 : b === "A" ? -1 : Number(a) - Number(b)));
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
            // Clear legacy build params (only on build planner route)
            if (this.buildPlannerActive || !this.damageSimActive) {
                for (const k of ["outfit","helmet","backpack","belt","arts","pn","pf","bsb","w1","w2","a1","a2","wp","ws","wsi","wg","ap","as","asi"]) url.searchParams.delete(k);
            }

            // Build pathname — for crafting, use the sub-category as the URL segment
            const pathState = {
                pack: this.activePack?.id,
                cat: this.isCrafting ? this.craftingCategory : this.activeCategory,
                buildPlanner: this.buildPlannerActive,
                damageSim: this.damageSimActive,
                armorMode: this.damageSimActive && this.ballisticsMode === "armor",
                maps: this.mapsActive,
                trading: this.tradingActive,
                playerInventory: this.playerInventoryActive,
                favorites: this.favoritesViewActive,
                recent: this.recentViewActive,
                versionCompare: this.versionCompareActive,
                startingLoadouts: this.startingLoadoutsActive,
                factionPools: this.factionPoolsActive,
                toolsLanding: this.toolsLandingActive,
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
            // "faction" keeps its original meaning (who you trade with); the
            // outfit's own faction is a second, independent axis.
            if (this.exchangeSourceFilter) {
                url.searchParams.set("from", this.exchangeSourceFilter);
            } else {
                url.searchParams.delete("from");
            }
            if (this.isOutfitExchange && this.exchangeDirection !== "give") {
                url.searchParams.set("dir", this.exchangeDirection);
            } else {
                url.searchParams.delete("dir");
            }
            if (this.isOutfitExchange && this.exchangeView !== "cards") {
                url.searchParams.set("exview", this.exchangeView);
            } else {
                url.searchParams.delete("exview");
            }
            if (this.isOutfitExchange && this.exchangeSort !== "name") {
                url.searchParams.set("exsort", this.exchangeSort);
            } else {
                url.searchParams.delete("exsort");
            }
            // Version compare filters
            if (this.versionCompareFilter) {
                url.searchParams.set("vcq", this.versionCompareFilter);
            } else {
                url.searchParams.delete("vcq");
            }
            if (this.versionComparePropertyFilter.length) {
                url.searchParams.set("vcp", this.versionComparePropertyFilter.join(","));
            } else {
                url.searchParams.delete("vcp");
            }
            if (this.versionCompareCategoryFilter.length) {
                url.searchParams.set("vcc", this.versionCompareCategoryFilter.join(","));
            } else {
                url.searchParams.delete("vcc");
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
                    exchangeSourceFilter: this.exchangeSourceFilter,
                    exchangeDirection: this.exchangeDirection,
                    exchangeView: this.exchangeView,
                    exchangeSort: this.exchangeSort,
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
            } else if (parsed.toolsLanding || legacyCat === "tools") {
                this.toolsLandingActive = true;
                this.activeCategory = null;
            } else if (parsed.damageSim) {
                this.openDamageSim();
            } else if (parsed.armorProtection) {
                this.openArmorProtection();
            } else if (parsed.maps || legacyCat === "maps") {
                this.mapsActive = true;
                this.mapsMounted = true;
                this.activeCategory = null;
            } else if (parsed.trading || legacyCat === "trading") {
                this.tradingActive = true;
                this.tradingMounted = true;
                this.activeCategory = null;
            } else if (parsed.playerInventory || legacyCat === "inventory") {
                this.playerInventoryActive = true;
                this.playerInventoryMounted = true;
                this.ensureLoadoutData();
                this.activeCategory = null;
                this.loadPlayerInventoryFromStorage();
            } else if (parsed.versionCompare || legacyCat === "version-compare") {
                this.versionCompareActive = true;
                this.activeCategory = null;
                const vcq = params.get("vcq");
                if (vcq) this.versionCompareFilter = vcq;
                const vcp = params.get("vcp");
                if (vcp) this.versionComparePropertyFilter = vcp.split(",");
                const vcc = params.get("vcc");
                if (vcc) this.versionCompareCategoryFilter = vcc.split(",");
                if (this.crossPackId) this.loadVersionCompareData();
            } else if (parsed.startingLoadouts || legacyCat === "starting-loadouts") {
                this.openStartingLoadouts();
            } else if (parsed.factionPools || legacyCat === "faction-drops") {
                this.openFactionPools();
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
            const fromFaction = params.get("from");
            if (fromFaction) this.exchangeSourceFilter = fromFaction;
            if (params.get("dir") === "want") this.exchangeDirection = "want";
            if (params.get("exview") === "matrix") this.exchangeView = "matrix";
            const exSort = params.get("exsort");
            if (exSort === "count" || exSort === "gain") this.exchangeSort = exSort;
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
            if (this.quickNavOpen) {
                this.quickNavOpen = false;
            } else if (this.whatsNewVisible) {
                this.dismissWhatsNew();
            } else if (this.shortcutHelpOpen) {
                this.shortcutHelpOpen = false;
            } else if (this.weaponMechanicsOpen) {
                this.weaponMechanicsOpen = false;
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
            this.globalResults = [];
            this.globalCraftingResults = [];
        },

        async navigateToItemInSection(id, category) {
            if (this.globalQuery.trim()) this.lastGlobalQuery = this.globalQuery;
            this.globalQuery = "";
            this.globalResults = [];
            this.globalCraftingResults = [];
            const entry = this.indexById[id];
            const fullName = entry ? this.tName(entry) : '';
            await this.selectCategory(category);
            if (fullName) { this.filterInput = fullName; this.filterQuery = fullName; }
            this.navigateToItem(id);
        },

        async selectCraftingSearchResult(result) {
            this.lastGlobalQuery = this.globalQuery;
            this.globalQuery = "";
            this.globalResults = [];
            this.globalCraftingResults = [];
            this.highlightedCraftingId = null;
            await this.selectCategory(CAT.CRAFTING);
            this.craftingCategory = result.craftCategory || 'all';
            this.filterInput = result.displayName || '';
            this.filterQuery = result.displayName || '';
            this.highlightedCraftingId = result.id;
            setTimeout(() => { this.highlightedCraftingId = null; }, 2200);
        },

        // Build Planner methods
        async openBuildPlanner() {
            this.resetViewState();
            this.buildPlannerActive = true;
            this.buildPlannerMounted = true;

            // Load equipment category data
            const cats = ["outfits", "helmets", "belt-attachments", "artefacts", ...WEAPON_CATEGORY_SLUGS, GRENADE_SLUG, "ammo"];
            // Category data is loaded by the loop below, which also builds the
            // per-category Fuse index -- only the mitigation table is needed here.
            const plateMitigationLoad = this.fetchPlateMitigation();
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
            await plateMitigationLoad;

            this.loadBuildFromStorage();
            this.loadInventoryFromStorage();
            this.loadSavedBuilds();
            this.buildInventorySort = localStorage.getItem("buildInventorySort") || "none";
            this.buildWeaponCompareSlot = localStorage.getItem("buildWeaponCompareSlot") || "primary";
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
        },

        async loadDamageSimData() {
            const cats = [...WEAPON_CATEGORY_SLUGS, "ammo"];
            await Promise.all([
                ...cats.map(async (slug) => {
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
                }),
                this.fetchMutantProfiles(),
                this.fetchNpcArmorProfiles(),
                this.fetchGboConstants(),
                this.fetchPbaConstants(),
                this.fetchCalibers(),
                this.fetchAmmoWeapons(),
                this.fetchWeaponAddonStatus(),
                this.fetchJsonCached("ballisticRangesCache", "ballistic-ranges.json"),
            ]);
        },

        async openDamageSim() {
            this.resetViewState();
            this.damageSimActive = true;
            this.damageSimMounted = true;
            this.ballisticsMode = "weapons";

            await this.loadDamageSimData();

            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
        },

        async selectBallisticsArmor() {
            this.ballisticsMode = "armor";
            await this.ensureArmorForSim();
        },

        async openArmorProtection() {
            this.resetViewState();
            this.damageSimActive = true;
            this.damageSimMounted = true;
            this.ballisticsMode = "armor";
            await this.loadDamageSimData();
            await this.ensureArmorForSim();
            if (!this._restoringUrl) this.pushUrlState(true);
            else this.pushUrlState();
        },

        async openBallisticsModal(weaponIds) {
            this.ballisticsModalWeaponIds = weaponIds;
            await this.loadDamageSimData();
            this.ballisticsModalOpen = true;
        },

        closeBallisticsModal() {
            this.ballisticsModalOpen = false;
            this.ballisticsModalWeaponIds = null;
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
            this.buildPlayerName = "Stalker";
            this.buildPlayerFaction = "stalker";
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
            if (data.playerName) this.buildPlayerName = data.playerName;
            if (data.playerFaction) this.buildPlayerFaction = data.playerFaction;
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

        // ── What's New ──

        initWhatsNew(rnData, hash) {
            const lastSeenDate = localStorage.getItem("whatsNewLastDate") || "";
            const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

            // Only show entries from releases newer than lastSeenDate and within the recency window
            let totalCount = 0;
            const highlighted = [];
            for (const release of rnData) {
                if (release.date <= lastSeenDate) continue;
                if (release.date < cutoff) continue;
                totalCount += release.entries.length;
                for (const entry of release.entries) {
                    if (entry.highlight) highlighted.push(entry);
                }
            }
            if (!highlighted.length) return;

            this._whatsNewLatestDate = rnData.length ? rnData[0].date : "";
            this.whatsNewTotalCount = totalCount;
            this.whatsNewEntries = highlighted;
            this.whatsNewVisible = true;
        },

        whatsNewEmoji(type) {
            return { added: "\u2728", changed: "\uD83D\uDD27", fixed: "\uD83D\uDC1B" }[type] || "\u2728";
        },

        whatsNewAction(entry) {
            if (!entry.action) return;
            this.whatsNewVisible = false;
            if (entry.action === "buildPlanner") {
                this.openBuildPlanner();
            } else if (entry.action === "craftingTrees" || entry.action === "crafting") {
                this.selectCategory(CAT.CRAFTING);
            } else if (entry.action === "maps") {
                this.openMaps();
            } else if (entry.action === "ballistics") {
                this.openDamageSim();
            } else if (entry.action === "trading") {
                this.openTrading();
            } else if (entry.action === "playerInventory") {
                this.openPlayerInventory();
            } else if (entry.action === "attachments") {
                this.selectCategory(CAT.SCOPES);
            } else if (entry.action === "outfits") {
                this.selectCategory(CAT.OUTFITS);
            } else if (entry.action === "startingLoadouts") {
                this.openStartingLoadouts();
            } else if (entry.action === "factionPools") {
                this.openFactionPools();
            }
        },

        dismissWhatsNew() {
            this.whatsNewVisible = false;
            try {
                if (this._whatsNewLatestDate) localStorage.setItem("whatsNewLastDate", this._whatsNewLatestDate);
            } catch (e) { /* quota */ }
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

                // Sort items so equipped items (equipSlot > 0) come first, ordered by slot.
                // This ensures equipped weapons fill loadout slots before ruck weapons.
                const sortedItems = [...result.items].sort((a, b) => {
                    const aSlot = a.equipSlot > 0 ? a.equipSlot : 999;
                    const bSlot = b.equipSlot > 0 ? b.equipSlot : 999;
                    return aSlot - bSlot;
                });

                for (const item of sortedItems) {
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

        // ─── Save Inventory page ─────────────────────────────────────────

        handlePlayerInventoryFiles(fileList) {
            let scopFile = null, scocFile = null;
            for (const f of fileList) {
                const name = f.name.toLowerCase();
                if (name.endsWith(".scop")) scopFile = f;
                else if (name.endsWith(".scoc")) scocFile = f;
            }
            if (!scopFile) {
                this.playerInventoryError = this.t("app_save_import_error_filetype") || "Please select a .scop save file";
                return;
            }
            if (scopFile.size > 50 * 1024 * 1024) {
                this.playerInventoryError = this.t("app_save_import_error_size") || "Save file too large (>50 MB)";
                return;
            }
            this.parsePlayerInventory(scopFile, scocFile);
        },

        async parsePlayerInventory(scopFile, scocFile) {
            this.playerInventoryParsing = true;
            this.playerInventoryError = "";
            try {
                const buffer = await scopFile.arrayBuffer();
                const knownIds = new Set(this.index.map(e => e.id));

                // Parse .scoc first (if provided) — it names the player's deployed stash
                // container IDs, which the .scop parser needs to collect their contents.
                let scocData = null;
                if (scocFile) {
                    try {
                        scocData = ScocParser.parse(await scocFile.arrayBuffer());
                    } catch (e) { /* .scoc parsing is optional */ }
                }

                const result = ScopParser.parse(buffer, knownIds, scocData ? scocData.playerStashIds : null);

                if (result.items.length === 0 && result.stashItems.length === 0) {
                    this.playerInventoryError = this.t("app_save_import_error_empty") || "No recognized items found in actor inventory or stash";
                    return;
                }

                const model = this.buildPlayerInventoryModel(result, scocData, scopFile.name);
                await this.ensurePlayerInventoryCategories(model);
                this.playerInventoryParseResult = model;
                this.savePlayerInventoryToStorage();
            } catch (e) {
                this.playerInventoryError = e.message || String(e);
            } finally {
                this.playerInventoryParsing = false;
            }
        },

        buildPlayerInventoryModel(result, scocData, fileName) {
            const beltIds = scocData ? scocData.beltItemIds : null;
            // Aggregate duplicate sections into one entry with a quantity.
            // Note: an ammo box is a single object — qty counts boxes, not rounds.
            const aggregate = (list) => {
                const bySection = new Map();
                for (const it of list) {
                    let agg = bySection.get(it.sectionName);
                    if (!agg) {
                        agg = { s: it.sectionName, q: 0, c: -1, e: false };
                        bySection.set(it.sectionName, agg);
                    }
                    agg.q++;
                    const cond = (it.condition >= 0 && it.condition <= 1) ? it.condition : -1;
                    if (cond > agg.c) agg.c = cond;
                    if (it.equipSlot > 0 || (beltIds && beltIds.has(it.id))) agg.e = true;
                }
                return [...bySection.values()];
            };

            const containers = [];
            for (const cont of result.stashContainers) {
                const contItems = result.stashItems.filter(it => it.parentId === cont.id);
                if (!contItems.length) continue;
                containers.push({
                    id: cont.id,
                    section: cont.section,
                    kind: cont.kind || "workshop",
                    levelId: cont.levelId,
                    items: aggregate(contItems),
                });
            }
            // Base stash(es) first, then deployed boxes; stable within each kind.
            containers.sort((a, b) => (a.kind === "workshop" ? 0 : 1) - (b.kind === "workshop" ? 0 : 1));

            // Per-weapon loaded-ammo index, keyed by resolved section. The LoadoutDrawer
            // resolves it against each weapon's ammo type list to pre-fill ammo slots.
            // Prefer an equipped weapon's value when a section appears more than once.
            const weaponAmmoIdx = {};
            for (const it of result.items) {
                if (it.ammoTypeIndex < 0) continue;
                if (it.equipSlot > 0 || !(it.sectionName in weaponAmmoIdx)) {
                    weaponAmmoIdx[it.sectionName] = it.ammoTypeIndex;
                }
            }

            return {
                v: 1,
                fileName,
                savedAt: Date.now(),
                actor: {
                    name: this.extractCharNameFromFilename(fileName) || result.actorPosition?.name || "",
                    levelId: result.actorPosition?.levelId || null,
                },
                actorItems: aggregate(result.items),
                weaponAmmoIdx,
                containers,
                totalItems: result.items.length,
                stashCount: containers.length,
                stats: (scocData && scocData.stats) || null,
                // Per-faction goodwill from the .scop relations registry (may be null)
                goodwill: result.communityGoodwill || null,
            };
        },

        async ensurePlayerInventoryCategories(model) {
            const byId = new Map(this.index.map(e => [e.id, e]));
            const cats = new Set();
            const collect = (items) => {
                for (const it of items) {
                    const entry = byId.get(it.s);
                    if (entry) cats.add(categorySlug(entry.category));
                }
            };
            collect(model.actorItems);
            for (const cont of model.containers) collect(cont.items);
            await Promise.all([...cats].map(slug => this.ensureCategoryLoaded(slug)));
        },

        startBlankPlayerInventory() {
            this.playerInventoryParseResult = {
                v: 1,
                manual: true,
                fileName: "",
                savedAt: Date.now(),
                actor: { name: "", levelId: null },
                actorItems: [],
                containers: [],
                totalItems: 0,
                stashCount: 0,
            };
            this.playerInventoryError = "";
            this.savePlayerInventoryToStorage();
        },

        /** Manual-stash editing: add/remove `delta` of an item in the actor inventory. */
        async adjustPlayerInventoryItem(itemId, delta) {
            const model = this.playerInventoryParseResult;
            if (!model) return;
            let item = model.actorItems.find(i => i.s === itemId);
            if (!item) {
                if (delta <= 0) return;
                item = { s: itemId, q: 0, c: -1, e: false };
                model.actorItems.push(item);
                const entry = this.indexById[itemId];
                if (entry) await this.ensureCategoryLoaded(categorySlug(entry.category));
            }
            // Mark as differing from the imported save (shows the blue "modified" dot)
            item.m = true;
            item.q += delta;
            if (item.q <= 0) {
                model.actorItems.splice(model.actorItems.indexOf(item), 1);
            }
            model.totalItems = model.actorItems.reduce((n, i) => n + i.q, 0);
            this.savePlayerInventoryToStorage();
        },

        /** Manual-stash editing: reconcile equipped flags to a loadout the user
            built in the LOADOUT panel. Equipped gear is marked `e`, and any piece
            the stash doesn't already hold is added (qty 1) so it persists and its
            category loads (enabling outfit-derived belt slots). */
        async setManualLoadout(loadout) {
            const model = this.playerInventoryParseResult;
            if (!model || !model.manual) return;
            const equipped = new Set();
            for (const key of ["helmet", "outfit", "backpack", "primary", "secondary", "sidearm", "grenade"]) {
                if (loadout[key]) equipped.add(loadout[key]);
            }
            for (const id of loadout.belt || []) if (id) equipped.add(id);

            for (const it of model.actorItems) it.e = equipped.has(it.s);
            for (const id of equipped) {
                if (!model.actorItems.some(it => it.s === id)) {
                    model.actorItems.push({ s: id, q: 1, c: -1, e: true });
                }
            }
            model.totalItems = model.actorItems.reduce((n, i) => n + i.q, 0);
            this.savePlayerInventoryToStorage();
            // Load full data for any newly-equipped categories so resolveFull can
            // read the outfit's artefact capacity (drives the belt slot count).
            await this.ensurePlayerInventoryCategories(model);
        },

        /** Manual-stash editing: persist the loadout's per-weapon loaded ammo. Ammo
            isn't "equipped" gear, so it lives on its own field rather than the
            equipped-flag reconciliation in setManualLoadout. */
        setManualLoadoutAmmo(ammo) {
            const model = this.playerInventoryParseResult;
            if (!model || !model.manual) return;
            model.loadoutAmmo = {
                primary: ammo.primary || null,
                secondary: ammo.secondary || null,
                sidearm: ammo.sidearm || null,
            };
            this.savePlayerInventoryToStorage();
        },

        savePlayerInventoryToStorage() {
            if (!this.activePack || !this.playerInventoryParseResult) return;
            try {
                localStorage.setItem(`playerInventory:${this.activePack.id}`, JSON.stringify(this.playerInventoryParseResult));
            } catch (e) { /* quota or private mode */ }
        },

        loadPlayerInventoryFromStorage() {
            if (!this.activePack) return;
            try {
                const raw = localStorage.getItem(`playerInventory:${this.activePack.id}`);
                if (!raw) return;
                const model = JSON.parse(raw);
                if (!model || model.v !== 1) return;
                this.playerInventoryParseResult = model;
                this.ensurePlayerInventoryCategories(model);
            } catch (e) { /* corrupted payload — start empty */ }
        },

        clearPlayerInventory() {
            this.playerInventoryParseResult = null;
            this.playerInventoryError = "";
            if (this.activePack) {
                try { localStorage.removeItem(`playerInventory:${this.activePack.id}`); } catch (e) { /* ignore */ }
            }
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

        setBuildHitZone(zone) {
            this.buildHitZone = zone === "head" ? "head" : "body";
            try { localStorage.setItem("buildHitZone", this.buildHitZone); } catch (e) { /* quota */ }
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

        parsePerk(item) {
            const key = item?.st_data_export_perk_description;
            if (!key) return null;
            const raw = this.t(key);
            if (!raw || raw === key) return null;
            const NL = /\x5cn/g;
            const lines = raw.split(NL).map(l => l.trim()).filter(Boolean);
            if (!lines.length) return null;
            const first = lines[0].replace(/^perk\s*:\s*/i, "").trim();
            const items = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (/^[••]/.test(line)) {
                    items.push({ kind: "bullet", text: line.replace(/^[••]\s*/, "").trim() });
                } else if (/^[-–—]/.test(line)) {
                    items.push({ kind: "sub", text: line.replace(/^[-–—]\s*/, "").trim() });
                } else if (line) {
                    items.push({ kind: "section", text: line.replace(/:\s*$/, "").trim() });
                }
            }
            if (!first && !items.length) return null;
            return { name: first, items };
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
                const hiddenWeaponStats = slotType === "grenade" ? null : this.hiddenWeaponStatFields;
                for (const slug of searchSlugs) {
                    const items = this.categoryItems[slug] || [];
                    if (items.some(i => i.id === item.id)) {
                        const headers = this.categoryHeaders[slug] || [];
                        return headers.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total ") && h !== "id" && !(hiddenWeaponStats && hiddenWeaponStats.has(h)));
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
            if (slug) {
                const headers = this.categoryHeaders[slug] || [];
                const fields = headers.filter(h => !TILE_HIDE.has(h) && !h.startsWith("Total ") && h !== "id");
                // Ballistic Rating is computed, not a column, so inject it next to
                // BR Class the way the item table does.
                if ((slotType === "outfit" || slotType === "helmet")
                    && typeof item.boneArmor === "number" && typeof item.hitFractionActor === "number") {
                    const apIdx = fields.indexOf("ui_inv_ap_res");
                    if (apIdx >= 0) fields.splice(apIdx, 0, "_ballistic_rating");
                    else fields.push("_ballistic_rating");
                }
                return fields;
            }
            // Fallback: resolve category from index and use its headers
            const indexEntry = (this.index || []).find(i => i.id === item.id);
            if (indexEntry?.category) {
                const fallbackSlug = categorySlug(indexEntry.category);
                const headers = this.categoryHeaders[fallbackSlug] || [];
                const cat = indexEntry.category;
                const isAddon = cat === CAT.SCOPES || cat === CAT.SILENCERS || cat === CAT.GRENADE_LAUNCHERS || cat === CAT.TACTICAL_KITS;
                const isKit = cat === CAT.TACTICAL_KITS;
                if (headers.length) {
                    return headers.filter(h => {
                        if (h.startsWith("Total ") || h === "id") return false;
                        if (isKit && KIT_HIDE_FIELDS.has(h)) return false;
                        if (isAddon && h === "st_upgr_cost") return true;
                        return !TILE_HIDE.has(h);
                    });
                }
            }
            return [];
        },

        buildHoverCompareFields() {
            if (!this.hoverItem || !this.hoverCompareItem) return [];
            const hoverFields = this.getItemFields(this.hoverItem);
            const equippedFields = this.getItemFields(this.hoverCompareItem);
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
            this.showItemHover(item, event, compareItem);
        },

        moveBuildHover(event) {
            this.moveItemHover(event);
        },

        hideBuildHover() {
            this.hideItemHover();
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
        modalOpen(open) {
            // Close any lingering hover preview when the item modal opens, regardless
            // of which path opened it.
            if (open) this.hideItemHover();
        },
        crossPackId(val) {
            if (val) localStorage.setItem("crossPackId", val);
            else localStorage.removeItem("crossPackId");
            this.loadCrossPackItem(val);
            if (this.versionCompareActive) this.loadVersionCompareData();
        },
        versionCompareFilter() { if (this.versionCompareActive) this.pushUrlState(); },
        versionComparePropertyFilter() { if (this.versionCompareActive) this.pushUrlState(); },
        versionCompareCategoryFilter() { if (this.versionCompareActive) this.pushUrlState(); },
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
        exchangeSourceFilter() {
            if (!this._restoringUrl) this.pushUrlState();
        },
        exchangeDirection() {
            if (!this._restoringUrl) this.pushUrlState();
        },
        exchangeView() {
            if (!this._restoringUrl) this.pushUrlState();
        },
        exchangeSort() {
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
            this.saveBuildToStorage();
        },
        buildPlayerFaction() {
            if (this.buildPlannerActive && !this._restoringUrl) this.pushUrlState();
            this.saveBuildToStorage();
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

            // Ctrl+K / Cmd+K: open quick navigation
            if ((e.ctrlKey || e.metaKey) && e.key === KEYS.QUICK_NAV) {
                e.preventDefault();
                this.quickNavOpen = !this.quickNavOpen;
                return;
            }

            // Alt+ArrowLeft / Alt+ArrowRight: cycle through nav-bar tabs
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                const NAV_TABS = ['db', 'crafting', 'build-planner', 'tools', 'maps', 'trading', 'inventory'];
                let current;
                if (this.playerInventoryActive) current = 'inventory';
                else if (this.tradingActive)   current = 'trading';
                else if (this.mapsActive)      current = 'maps';
                else if (this.toolsLandingActive || this.damageSimActive || this.versionCompareActive || this.startingLoadoutsActive || this.factionPoolsActive) current = 'tools';
                else if (this.buildPlannerActive) current = 'build-planner';
                else if (this.isCrafting)      current = 'crafting';
                else                           current = 'db';
                const idx = NAV_TABS.indexOf(current);
                const next = NAV_TABS[(idx + (e.key === 'ArrowRight' ? 1 : -1) + NAV_TABS.length) % NAV_TABS.length];
                if (next === 'db')            this.openItemDb();
                else if (next === 'crafting') this.openCrafting();
                else if (next === 'build-planner') this.openBuildPlanner();
                else if (next === 'tools')         this.openToolsLanding();
                else if (next === 'maps')          this.openMaps();
                else if (next === 'trading')       this.openTrading();
                else if (next === 'inventory')     this.openPlayerInventory();
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
                if (matchesKey(e.key, KEYS.PREV_ITEM)) { this.navigateModal(-1); return; }
                if (matchesKey(e.key, KEYS.NEXT_ITEM)) { this.navigateModal(1); return; }
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
            if (matchesKey(e.key, KEYS.SEARCH)) {
                e.preventDefault();
                if (!this.globalQuery && this.lastGlobalQuery) {
                    this.globalQuery = this.lastGlobalQuery;
                    this.globalSearch();
                }
                this.$refs.headerBar?.focusSearch();
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
            if (matchesKey(e.key, KEYS.PREV_CATEGORY) || matchesKey(e.key, KEYS.NEXT_CATEGORY)) {
                this.navigateCategory(matchesKey(e.key, KEYS.PREV_CATEGORY) ? -1 : 1);
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

        // 0. Load global data manifest (content hashes for cache busting of pack-independent JSONs)
        let globalManifest = {};
        try {
            const gmRes = await fetch("/data/manifest.json", { cache: "no-cache" });
            if (gmRes.ok) globalManifest = await gmRes.json();
        } catch { /* ignore */ }
        const globalDataUrl = (f) => `/data/${f}${globalManifest[f] ? "?v=" + globalManifest[f] : ""}`;

        // 1. Load app translations (pack-independent UI strings)
        try {
            const appTrRes = await fetch(globalDataUrl("app_translations.json"));
            if (appTrRes.ok) this.appTranslations = await appTrRes.json();
        } catch { /* ignore */ }

        // 2. Load pack manifest
        try {
            const packRes = await fetch(globalDataUrl("packs.json"));
            const manifest = await packRes.json();
            this.packs = manifest.packs;
            this.globalHiddenFields = manifest.hiddenFields || [];
            this._defaultPackId = manifest.default;

            // Determine initial pack: path > legacy query param > localStorage > manifest default
            const parsedPath = parsePathUrl(window.location.pathname);
            const legacyUrlPack = new URLSearchParams(window.location.search).get("pack");
            const urlPack = parsedPath.pack || legacyUrlPack;
            const savedPack = localStorage.getItem("selectedPack");
            const savedPackEntry = savedPack ? this.packs.find((p) => p.id === savedPack) : null;
            let resolvedSavedPack = null;
            if (savedPackEntry && !savedPackEntry.deprecated) {
                resolvedSavedPack = savedPack;
            } else if (savedPackEntry?.deprecated) {
                const family = savedPack.split("-")[0];
                const successor = this.packs.find((p) => !p.deprecated && p.id.split("-")[0] === family);
                resolvedSavedPack = successor?.id || null;
            }
            const targetId = urlPack || resolvedSavedPack || manifest.default;
            this.activePack = this.packs.find((p) => p.id === targetId) || this.packs[0];

            // URL will be updated after state restoration below

            // Persist selection
            localStorage.setItem("selectedPack", this.activePack.id);

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

        // 6aa. Restore hideTacticalKit from localStorage
        try {
            const savedHideKit = localStorage.getItem("hideTacticalKit");
            if (savedHideKit !== null) this.hideTacticalKit = JSON.parse(savedHideKit);
        } catch (e) { /* ignore */ }

        // 6a. Restore hideUnusedAmmo from localStorage
        try {
            const savedHideAmmo = localStorage.getItem("hideUnusedAmmo");
            if (savedHideAmmo !== null) this.hideUnusedAmmo = JSON.parse(savedHideAmmo);
        } catch (e) { /* ignore */ }

        try {
            const savedIcons = localStorage.getItem("showTileIcons");
            if (savedIcons !== null) this.showTileIcons = JSON.parse(savedIcons);
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
                // Browser Back/Forward. modalItem is still the outgoing item here, so
                // snapshot its scroll first, then restore the target item's saved offset.
                this._saveCurrentModalScroll();
                this.openItem(hash, this._modalScrollById[hash] || 0);
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
                    await this.loadPackData();
                }
            }
            if (parsed.buildPlanner) {
                if (!this.buildPlannerActive) await this.openBuildPlanner();
            } else if (parsed.damageSim) {
                if (!this.damageSimActive || this.ballisticsMode !== "weapons") await this.openDamageSim();
            } else if (parsed.armorProtection) {
                if (!this.damageSimActive || this.ballisticsMode !== "armor") await this.openArmorProtection();
            } else if (parsed.trading) {
                if (!this.tradingActive) this.openTrading();
            } else if (parsed.playerInventory) {
                if (!this.playerInventoryActive) this.openPlayerInventory();
            } else if (parsed.favorites) {
                this.resetViewState();
                this.favoritesViewActive = true;
            } else if (parsed.recent) {
                this.resetViewState();
                this.recentViewActive = true;
            } else if (parsed.versionCompare) {
                if (!this.versionCompareActive) {
                    this.resetViewState();
                    this.versionCompareActive = true;
                    if (this.crossPackId) this.loadVersionCompareData();
                }
            } else if (parsed.startingLoadouts) {
                if (!this.startingLoadoutsActive) await this.openStartingLoadouts();
            } else if (parsed.factionPools) {
                if (!this.factionPoolsActive) await this.openFactionPools();
            } else if (parsed.cat && CRAFTING_SUBCATEGORIES.has(parsed.cat)) {
                await this.selectCategory(CAT.CRAFTING);
                this.craftingCategory = parsed.cat;
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
