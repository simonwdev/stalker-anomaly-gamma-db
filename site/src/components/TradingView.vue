<template>
<div class="trading-view" v-if="packId && traders.length">
    <!-- Trader selector pills -->
    <div class="trading-toolbar">
        <div class="trading-trader-pills">
            <button
                v-for="trader in displayTraders"
                :key="trader.id"
                class="trading-pill"
                :class="{ active: selectedTrader === trader.id }"
                @click="selectTrader(trader.id)"
            >
                <span class="trading-pill-dot" :style="{ background: trader.color }"></span>
                {{ traderName(trader) }}
            </button>
        </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="trading-loading">
        <div class="loading-spinner"></div>
    </div>

    <!-- Controls bar: chrome strip outside the scroll region so it stays fixed -->
    <div class="trading-controls-bar" v-if="!loading && traderData">
        <div class="trading-controls-row">
            <div class="trading-search-wrap">
                <input
                    type="text"
                    class="trading-search"
                    v-model="searchQuery"
                    :placeholder="t('app_trading_search')"
                >
                <button v-if="searchQuery" class="trading-search-clear" @click="searchQuery = ''">&times;</button>
            </div>

            <!-- Filter button + popover -->
            <div class="trading-menu-wrap" v-click-outside="closeFilterPanel">
                <button
                    class="trading-menu-btn"
                    :class="{ active: filterPanelOpen, 'has-active': activeFilterCount > 0 }"
                    @click.stop="filterPanelOpen = !filterPanelOpen"
                    v-tooltip="t('app_label_filters')"
                >
                    <LucideSlidersHorizontal :size="13" />
                    <span class="trading-menu-btn-label">{{ t('app_label_filters') }}</span>
                    <span v-if="activeFilterCount > 0" class="trading-menu-badge">{{ activeFilterCount }}</span>
                </button>
                <div class="trading-popover" v-show="filterPanelOpen" @click.stop>
                    <div class="trading-popover-header">
                        <span>{{ t('app_label_filters') }}</span>
                        <a v-if="activeFilterCount > 0" href="#" class="trading-popover-clear" @click.prevent="clearAllFilters">{{ t('app_label_clear_all') }}</a>
                    </div>
                    <div v-if="supplyKeys.length" class="trading-popover-group">
                        <label
                            class="trading-popover-toggle"
                            @click="stockedOnly = !stockedOnly"
                        >
                            <span class="toggle-switch" :class="{ on: stockedOnly }">
                                <span class="toggle-knob"></span>
                            </span>
                            <span class="trading-popover-toggle-label">{{ t('app_trading_stocked_only') }}</span>
                        </label>
                    </div>
                    <div v-if="supplyKeys.length > 1" class="trading-popover-group">
                        <div class="trading-popover-label">{{ t('app_trading_filter_level') }}</div>
                        <div class="trading-popover-chips">
                            <button
                                v-for="key in supplyKeys"
                                :key="key"
                                class="trading-popover-chip"
                                :class="{ active: selectedTiers.includes(key) }"
                                @click="toggleTier(key)"
                            >{{ tierLabel(key) }}</button>
                        </div>
                    </div>
                    <div v-if="availableCategories.length" class="trading-popover-group">
                        <div class="trading-popover-label">{{ t('app_trading_filter_category') }}</div>
                        <div class="trading-popover-chips">
                            <button
                                v-for="cat in availableCategories"
                                :key="cat"
                                class="trading-popover-chip"
                                :class="{ active: selectedCategories.includes(cat) }"
                                @click="toggleCategory(cat)"
                            >{{ tCat(cat) || cat }}</button>
                        </div>
                    </div>
                    <div v-if="availableOrigins.length" class="trading-popover-group">
                        <div class="trading-popover-label">{{ t('app_filter_origin') }}</div>
                        <div class="trading-popover-chips">
                            <button
                                v-for="o in availableOrigins"
                                :key="o"
                                class="trading-popover-chip"
                                :class="['origin-' + o, { active: selectedOrigins.includes(o) }]"
                                @click="toggleOrigin(o)"
                            >{{ originLabel(o) }}</button>
                        </div>
                    </div>
                    <div v-if="!availableCategories.length && !availableOrigins.length && !supplyKeys.length" class="trading-popover-empty">
                        {{ t('app_trading_no_filters_available') }}
                    </div>
                </div>
            </div>

            <!-- Sort button + popover -->
            <div class="trading-menu-wrap" v-click-outside="closeSortMenu">
                <button
                    class="trading-menu-btn"
                    :class="{ active: sortMenuOpen }"
                    @click.stop="sortMenuOpen = !sortMenuOpen"
                    v-tooltip="t('app_label_sort')"
                >
                    <LucideArrowUpDown :size="13" />
                    <span class="trading-menu-btn-label">{{ sortFieldLabel(sortKey) }}</span>
                    <span class="trading-menu-btn-dir">{{ sortAsc ? '▲' : '▼' }}</span>
                </button>
                <div class="trading-popover trading-popover--sort" v-show="sortMenuOpen" @click.stop>
                    <button class="trading-sort-item" @click="sortAsc = !sortAsc">
                        <span class="trading-sort-check">{{ sortAsc ? '▲' : '▼' }}</span>
                        <span>{{ sortAsc ? t('app_label_ascending') : t('app_label_descending') }}</span>
                    </button>
                    <div class="trading-popover-divider"></div>
                    <div class="trading-popover-label">{{ t('app_label_sort_by') }}</div>
                    <button
                        v-for="field in sortableFields"
                        :key="field"
                        class="trading-sort-item"
                        :class="{ active: sortKey === field }"
                        @click="pickSort(field)"
                    >
                        <span class="trading-sort-check">{{ sortKey === field ? '✓' : '' }}</span>
                        <span>{{ sortFieldLabel(field) }}</span>
                    </button>
                </div>
            </div>

            <div class="trading-meta-chips" v-if="traderData.discounts && traderData.discounts.length">
                <span v-for="d in traderData.discounts" :key="d[0]" class="trading-discount-badge" :class="d[0]">
                    {{ t('app_trading_discount_' + d[0]) || d[0] }} {{ (d[1] * 100).toFixed(0) }}%
                </span>
            </div>
        </div>
        <div class="trading-active-filters" v-if="activeFilterCount > 0">
            <span v-for="key in selectedTiers" :key="'t-' + key" class="trading-active-chip">
                <span class="trading-active-chip-label">{{ t('app_trading_filter_level') }}: {{ tierLabel(key) }}</span>
                <button class="trading-active-chip-remove" @click="toggleTier(key)">&times;</button>
            </span>
            <span v-for="cat in selectedCategories" :key="'c-' + cat" class="trading-active-chip">
                <span class="trading-active-chip-label">{{ t('app_trading_filter_category') }}: {{ tCat(cat) || cat }}</span>
                <button class="trading-active-chip-remove" @click="toggleCategory(cat)">&times;</button>
            </span>
            <span v-for="o in selectedOrigins" :key="'o-' + o" class="trading-active-chip">
                <span class="trading-active-chip-label">{{ t('app_filter_origin') }}: {{ originLabel(o) }}</span>
                <button class="trading-active-chip-remove" @click="toggleOrigin(o)">&times;</button>
            </span>
            <a href="#" class="trading-active-clear" @click.prevent="clearAllFilters">{{ t('app_label_clear_all') }}</a>
        </div>
    </div>

    <!-- Content -->
    <div v-if="!loading && traderData" class="trading-content">
        <div class="trading-items-grid" v-if="filteredItems.length">
            <a
                v-for="entry in filteredItems"
                :key="entry.id"
                class="trading-item-card"
                :class="{ 'trading-item-card--linked': !!resolveItem(entry.id) }"
                href="#"
                @click.prevent="resolveItem(entry.id) && $emit('navigateToItem', resolveItem(entry.id).id)"
                @mouseenter="resolveItem(entry.id) && $emit('showItemHover', resolveItem(entry.id).id, $event)"
                @mousemove="$emit('moveItemHover', $event)"
                @mouseleave="$emit('hideItemHover')"
            >
                <div class="trading-item-info">
                    <div class="trading-item-name">
                        {{ itemDisplayName(entry.id) }}
                    </div>
                    <div class="trading-item-meta-row">
                        <span class="trading-item-cat">{{ categoryLabel(entry.id) }}</span>
                        <span class="trading-item-tiers" v-if="entry.tiers.length">
                            <span
                                class="trading-tier-badge"
                                v-tooltip="tierTooltip(entry.tiers[0])"
                            >{{ tierBadgeLabel(entry.tiers[0]) }}</span>
                        </span>
                    </div>
                </div>
                <span class="trading-item-qty" v-if="entry.qty != null">×{{ entry.qty }}</span>
                <div class="trading-item-prices" v-if="buyPrice(entry.id) != null || sellPrice(entry.id) != null || (entry.prob != null && entry.prob < 1)">
                    <span class="trading-price trading-price--buy" v-if="buyPrice(entry.id) != null">
                        <LucideArrowDownCircle :size="10" />{{ formatPrice(buyPrice(entry.id)) }}
                    </span>
                    <span class="trading-price trading-price--sell" v-if="sellPrice(entry.id) != null">
                        <LucideArrowUpCircle :size="10" />{{ formatPrice(sellPrice(entry.id)) }}
                    </span>
                    <span
                        class="trading-item-prob"
                        v-if="entry.prob != null && entry.prob < 1"
                        :class="{ 'trading-item-prob--low': entry.prob < 0.5 }"
                    >
                        <span class="prob-bar" :style="{ width: (entry.prob * 100) + '%' }"></span>
                        {{ (entry.prob * 100).toFixed(0) }}%
                    </span>
                </div>
            </a>
        </div>
        <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
    </div>
</div>
</template>

<script>
export default {
    props: {
        packId: { type: String, default: null },
        indexById: { type: Object, default: () => ({}) },
    },
    inject: ['t', 'tName', 'tCat', 'tCatSingular', 'tItemName'],
    emits: ['navigateToItem', 'showItemHover', 'moveItemHover', 'hideItemHover'],
    data() {
        return {
            traders: [],
            selectedTrader: null,
            traderData: null,
            loading: false,
            searchQuery: '',
            cache: {},
            // Price lookup: id -> base cost (st_upgr_cost)
            priceById: {},
            // Origin classification per id, derived from per-category JSON factions array.
            // Stored as primary origin string ('nato' | 'wp' | 'other') or null when unknown.
            originById: {},
            // Tracks which category slugs have already been fetched for prices
            catPriceFetched: {},
            // Universal item data from items-common.json (id -> { name?, price? })
            itemsCommon: {},
            // Filter + sort state (per trader; reset on trader change)
            selectedCategories: [],
            selectedOrigins: [],
            selectedTiers: [],
            stockedOnly: true,
            filterPanelOpen: false,
            sortMenuOpen: false,
            sortKey: 'name',
            sortAsc: true,
        };
    },
    computed: {
        displayTraders() {
            return [...this.traders].sort((a, b) =>
                this.traderName(a).localeCompare(this.traderName(b))
            );
        },
        supplyKeys() {
            if (!this.traderData) return [];
            return Object.keys(this.traderData)
                .filter(k => k.startsWith('supplies_') || k === 'supplies_generic')
                .sort();
        },
        supplyTierCount() {
            return this.supplyKeys.length;
        },
        // Unified trader entries: union of supply-tier items and ids referenced by buy/sell
        // condition multipliers. qty/prob come from the lowest tier the item appears in.
        allEntries() {
            if (!this.traderData) return [];
            const byId = new Map();
            for (const key of this.supplyKeys) {
                for (const row of (this.traderData[key] || [])) {
                    const id = row[0];
                    let e = byId.get(id);
                    if (!e) {
                        e = { id, tiers: [], qty: row[1], prob: row[2] ?? null, stocked: true };
                        byId.set(id, e);
                    }
                    e.tiers.push(key);
                }
            }
            for (const id of Object.keys(this.buyConditionMap)) {
                if (!byId.has(id)) byId.set(id, { id, tiers: [], qty: null, prob: null, stocked: false });
            }
            for (const id of Object.keys(this.sellConditionMap)) {
                if (!byId.has(id)) byId.set(id, { id, tiers: [], qty: null, prob: null, stocked: false });
            }
            return [...byId.values()];
        },
        filteredItems() {
            const q = this.searchQuery.trim().toLowerCase();
            const cats = this.selectedCategories;
            const origins = this.selectedOrigins;
            const tiers = this.selectedTiers;
            const filtered = this.allEntries.filter(entry => {
                if (this.stockedOnly && !entry.stocked) return false;
                const id = entry.id;
                if (q) {
                    const idMatch = id.toLowerCase().includes(q);
                    const resolved = this.resolveItem(id);
                    const nameMatch = resolved && this.tName(resolved).toLowerCase().includes(q);
                    if (!idMatch && !nameMatch) return false;
                }
                if (cats.length) {
                    const resolved = this.resolveItem(id);
                    if (!resolved || !cats.includes(resolved.category)) return false;
                }
                if (origins.length) {
                    const f = this.originById[id];
                    if (!Array.isArray(f) || !f.some(x => origins.includes(x))) return false;
                }
                if (tiers.length && !entry.tiers.some(k => tiers.includes(k))) return false;
                return true;
            });
            return this.sortEntries(filtered);
        },
        discountMap() {
            const m = { buy: 1, sell: 1 };
            for (const d of (this.traderData?.discounts || [])) {
                m[d[0]] = d[1];
            }
            return m;
        },
        buyConditionMap() {
            const map = {};
            for (const r of (this.traderData?.buy_condition || []))
                if (r[1] != null) map[r[0].replace(/_x$/, '')] = r[1];
            return map;
        },
        sellConditionMap() {
            const map = {};
            for (const r of (this.traderData?.sell_condition || []))
                if (r[1] != null) map[r[0].replace(/_x$/, '')] = r[1];
            return map;
        },
        availableCategories() {
            const cats = new Set();
            for (const e of this.allEntries) {
                const resolved = this.resolveItem(e.id);
                if (resolved?.category) cats.add(resolved.category);
            }
            return [...cats].sort((a, b) => (this.tCat(a) || a).localeCompare(this.tCat(b) || b));
        },
        availableOrigins() {
            const origins = new Set();
            for (const e of this.allEntries) {
                const f = this.originById[e.id];
                if (Array.isArray(f)) for (const x of f) origins.add(x);
            }
            const ORDER = ['wp', 'nato', 'other'];
            return [...origins].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
        },
        activeFilterCount() {
            return this.selectedCategories.length
                + this.selectedOrigins.length
                + this.selectedTiers.length;
        },
        sortableFields() {
            return ['name', 'category', 'qty', 'prob', 'buy', 'sell'];
        },
    },
    watch: {
        packId: {
            immediate: true,
            handler() {
                this.cache = {};
                this.priceById = {};
                this.originById = {};
                this.catPriceFetched = {};
                this.loadTradersMeta();
            },
        },
        selectedTrader() {
            this.selectedCategories = [];
            this.selectedOrigins = [];
            this.selectedTiers = [];
            this.stockedOnly = true;
            this.sortKey = 'name';
            this.sortAsc = true;
            this.loadTrader();
        },
    },
    methods: {
        catSlug(category) {
            return category.toLowerCase().replace(/ /g, '-');
        },
        basePrice(id) {
            return this.priceById[id] ?? this.itemsCommon[id]?.price ?? null;
        },
        buyPrice(id) {
            const base = this.basePrice(id);
            if (base == null) return null;
            return Math.round(base * this.discountMap.sell * (this.buyConditionMap[id] ?? 1));
        },
        sellPrice(id) {
            const base = this.basePrice(id);
            if (base == null) return null;
            return Math.round(base * this.discountMap.buy * (this.sellConditionMap[id] ?? 1));
        },
        formatPrice(val) {
            if (val == null) return null;
            return val.toLocaleString() + ' ₽';
        },
        async prefetchPrices() {
            if (!this.packId || !this.traderData) return;
            // Collect all item IDs across all supply tiers + conditions
            const ids = new Set();
            for (const key of Object.keys(this.traderData)) {
                if (!key.startsWith('supplies_') && key !== 'supplies_generic') continue;
                for (const row of (this.traderData[key] || [])) ids.add(row[0]);
            }
            for (const row of (this.traderData.buy_condition || [])) ids.add(row[0].replace(/_x$/, ''));
            for (const row of (this.traderData.sell_condition || [])) ids.add(row[0].replace(/_x$/, ''));

            // Group by category slug
            const slugsNeeded = new Set();
            for (const id of ids) {
                const entry = this.indexById[id];
                if (entry) slugsNeeded.add(this.catSlug(entry.category));
            }

            // Fetch missing category JSONs
            const fetches = [];
            for (const slug of slugsNeeded) {
                if (this.catPriceFetched[slug]) continue;
                this.catPriceFetched[slug] = true;
                fetches.push(
                    fetch(`/data/${this.packId}/${slug}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .then(data => {
                            if (!data) return;
                            for (const item of (data.items || [])) {
                                const cost = parseFloat(item.st_upgr_cost);
                                if (!isNaN(cost) && cost > 0) {
                                    this.priceById[item.id] = cost;
                                }
                                const f = item.factions;
                                if (Array.isArray(f) && f.length) {
                                    this.originById[item.id] = f.slice();
                                }
                            }
                        })
                        .catch(() => {})
                );
            }
            await Promise.all(fetches);
        },
        resolveItem(id) {
            return this.indexById[id] || null;
        },
        itemDisplayName(id) {
            const resolved = this.resolveItem(id);
            if (resolved) return this.tItemName(resolved);
            return this.t(this.itemsCommon[id]?.name || id);
        },
        categoryLabel(id) {
            const resolved = this.resolveItem(id);
            const cat = resolved && this.tCatSingular(resolved.category);
            return cat || this.t('app_trading_cat_misc');
        },
        selectTrader(id) {
            this.selectedTrader = id;
        },
        tierLabel(key) {
            if (key === 'supplies_generic') return this.t('app_trading_generic_tier') || 'Generic';
            const num = key.replace('supplies_', '');
            return `${this.t('app_trading_level')} ${num}`;
        },
        parseCondition(raw) {
            const FACTION_KEY = {
                stalker: 'app_faction_stalker', bandit: 'app_faction_bandit',
                csky: 'app_faction_clear_sky', dolg: 'app_faction_duty',
                freedom: 'app_faction_freedom', ecolog: 'app_faction_ecolog',
                army: 'app_faction_military', monolith: 'app_faction_monolith',
                killer: 'app_faction_mercenary', greh: 'app_faction_greh',
                isg: 'app_faction_isg',
            };
            const FACTION_FALLBACK = {
                stalker: 'Stalker', bandit: 'Bandit', csky: 'Clear Sky',
                dolg: 'Duty', freedom: 'Freedom', ecolog: 'Ecologist',
                army: 'Military', monolith: 'Monolith', killer: 'Mercenary',
                greh: 'Greh', isg: 'ISG',
            };

            const CONDITION_HANDLERS = {
                actor_goodwill_ge: (args) => {
                    const [factionRaw, threshold] = args.split(':');
                    const fKey = FACTION_KEY[factionRaw];
                    const fName = fKey ? (this.t(fKey) || FACTION_FALLBACK[factionRaw] || factionRaw) : factionRaw;
                    return `${fName} ≥ ${threshold}`;
                },
                heavy_pockets_functor: () => {
                    return this.t('app_trading_cond_heavy_pockets') || 'Heavy Pockets';
                },
                toolkit_task_done: (args) => {
                    return (this.t('app_trading_cond_toolkit_task') || 'Toolkit task {n} done').replace('{n}', args);
                },
                drugkit_task_done: () => {
                    return this.t('app_trading_cond_drugkit_task') || 'Drug kit task done';
                },
                raid_goodwill_check: (args) => {
                    return CONDITION_HANDLERS.actor_goodwill_ge(args);
                },
            };

            const parts = raw.split(/ OR /);
            const labels = [];

            for (const part of parts) {
                const p = part.trim();

                if (p.startsWith('+')) {
                    labels.push(p.slice(1).replace(/_/g, ' '));
                    continue;
                }

                if (p.startsWith('=')) {
                    const match = p.slice(1).match(/^(\w+)\((.*)\)$/);
                    if (match) {
                        const [, fnName, args] = match;
                        const handler = CONDITION_HANDLERS[fnName];
                        if (handler) {
                            labels.push(handler(args));
                            continue;
                        }
                        // Unknown function: humanize name
                        labels.push(fnName.replace(/_/g, ' ').trim());
                        continue;
                    }
                }

                labels.push(p.replace(/^=/, '').replace(/_/g, ' ').replace(/\(.*\)/, '').trim());
            }

            return labels;
        },
        traderName(trader) {
            const fromKey = this.t(trader.labelKey);
            return fromKey !== trader.labelKey ? fromKey : this.t(trader.label);
        },
        async loadTradersMeta() {
            if (!this.packId) return;
            this.itemsCommon = {};
            const pack = this.packId;
            try {
                const resp = await fetch(`/data/${pack}/traders-meta.json`);
                if (!resp.ok) throw new Error(resp.status);
                this.traders = await resp.json();
            } catch (e) {
                console.error('Failed to load traders meta:', e);
                this.traders = [];
            }
            if (!this.selectedTrader || !this.traders.find(t => t.id === this.selectedTrader)) {
                const preferred = this.traders.find(t => t.id === 'stalker_sidorovich');
                this.selectedTrader = preferred?.id ?? this.traders[0]?.id ?? null;
            }
            this.loadTrader();
            // items-common is optional — never let a missing file wipe traders
            try {
                const commonResp = await fetch(`/data/${pack}/items-common.json`);
                if (commonResp.ok) {
                    const ct = commonResp.headers.get('content-type') || '';
                    if (ct.includes('application/json') || ct.includes('text/plain')) {
                        this.itemsCommon = await commonResp.json();
                    }
                }
            } catch { /* optional — ignore */ }
        },
        async loadTrader() {
            if (!this.packId) return;
            const id = this.selectedTrader;
            if (this.cache[id]) {
                this.traderData = this.cache[id];
                return;
            }
            this.loading = true;
            try {
                const resp = await fetch(`/data/${this.packId}/traders/${id}.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                this.cache[id] = data;
                if (this.selectedTrader === id) {
                    this.traderData = data;
                        this.prefetchPrices();
                }
            } catch (e) {
                console.error('Failed to load trader data:', e);
                this.traderData = null;
            } finally {
                this.loading = false;
            }
        },
        toggleTier(key) {
            const i = this.selectedTiers.indexOf(key);
            if (i >= 0) this.selectedTiers.splice(i, 1);
            else this.selectedTiers.push(key);
        },
        tierBadgeLabel(key) {
            if (key === 'supplies_generic') return 'G';
            return 'L' + key.replace('supplies_', '');
        },
        tierTooltip(key) {
            const label = this.tierLabel(key);
            const conds = this.tierUnlock(key);
            if (!conds.length) return label;
            const or = this.t('app_trading_or') || 'OR';
            return `${label}: ${conds.join(' ' + or + ' ')}`;
        },
        tierUnlock(key) {
            if (!this.traderData?.buy_supplies) return [];
            const match = this.traderData.buy_supplies.find(s => s[0] === key);
            if (!match || !match[1]) return [];
            return this.parseCondition(match[1]);
        },
        toggleCategory(cat) {
            const i = this.selectedCategories.indexOf(cat);
            if (i >= 0) this.selectedCategories.splice(i, 1);
            else this.selectedCategories.push(cat);
        },
        toggleOrigin(o) {
            const i = this.selectedOrigins.indexOf(o);
            if (i >= 0) this.selectedOrigins.splice(i, 1);
            else this.selectedOrigins.push(o);
        },
        clearAllFilters() {
            this.selectedCategories = [];
            this.selectedOrigins = [];
            this.selectedTiers = [];
            this.stockedOnly = true;
        },
        closeFilterPanel() { this.filterPanelOpen = false; },
        closeSortMenu() { this.sortMenuOpen = false; },
        pickSort(field) {
            this.sortKey = field;
            this.sortMenuOpen = false;
        },
        sortFieldLabel(field) {
            const FALLBACK = { name: 'Name', category: 'Category', qty: 'Quantity', prob: 'Probability', buy: 'Buy price', sell: 'Sell price' };
            const KEYS = {
                name: 'app_trading_item',
                category: 'app_trading_filter_category',
                qty: 'app_trading_quantity',
                prob: 'app_trading_probability',
                buy: 'app_trading_sort_buy',
                sell: 'app_trading_sort_sell',
            };
            const k = KEYS[field];
            if (!k) return FALLBACK[field] || field;
            const v = this.t(k);
            return v && v !== k ? v : (FALLBACK[field] || field);
        },
        originLabel(o) {
            if (o === 'nato') return 'NATO';
            if (o === 'wp') return 'WP';
            const v = this.t('app_origin_other');
            return v && v !== 'app_origin_other' ? v : 'Other';
        },
        compareForKey(a, b, key) {
            const aId = a.id, bId = b.id;
            switch (key) {
                case 'name':
                    return this.itemDisplayName(aId).localeCompare(this.itemDisplayName(bId));
                case 'category': {
                    const ac = this.resolveItem(aId)?.category || '';
                    const bc = this.resolveItem(bId)?.category || '';
                    return (this.tCat(ac) || ac).localeCompare(this.tCat(bc) || bc);
                }
                case 'qty':
                    return (a.qty ?? 0) - (b.qty ?? 0);
                case 'prob':
                    return (a.prob ?? 1) - (b.prob ?? 1);
                case 'buy':
                    return (this.buyPrice(aId) ?? Infinity) - (this.buyPrice(bId) ?? Infinity);
                case 'sell':
                    return (this.sellPrice(aId) ?? Infinity) - (this.sellPrice(bId) ?? Infinity);
                default:
                    return 0;
            }
        },
        sortEntries(items) {
            const key = this.sortKey;
            const dir = this.sortAsc ? 1 : -1;
            const arr = items.slice();
            arr.sort((a, b) => {
                const c = this.compareForKey(a, b, key);
                if (c !== 0) return c * dir;
                return this.itemDisplayName(a.id).localeCompare(this.itemDisplayName(b.id));
            });
            return arr;
        },
    },
};
</script>

<style>
/* ── Trading View ── */
.trading-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 0.75rem 0.5rem 0;
    box-sizing: border-box;
    overflow: hidden;
}

/* Toolbar */
.trading-toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}
.trading-trader-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}
.trading-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
}
.trading-pill:hover { color: var(--text); border-color: var(--text-secondary); }
.trading-pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.trading-pill-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.trading-pill.active .trading-pill-dot { box-shadow: 0 0 0 2px rgba(255,255,255,0.4); }

/* Search */
.trading-search-wrap { position: relative; width: 100%; max-width: 320px; flex-shrink: 0; }
.trading-search {
    width: 100%; padding: 0.4rem 2rem 0.4rem 0.6rem;
    background: var(--color-surface-1); border: 1px solid var(--color-bg); border-radius: 4px;
    color: var(--text); font-size: 0.8rem; outline: none;
    box-shadow: inset 0 2px 4px var(--color-overlay-black-60);
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.trading-search:hover { border-color: var(--accent-dim); }
.trading-search:focus {
    border-color: var(--accent);
    background: var(--color-surface-2);
    box-shadow:
        inset 0 2px 4px var(--color-overlay-black-60),
        0 0 0 3px var(--color-accent-tint-20);
}
.trading-search-clear {
    position: absolute; right: 0.3rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; line-height: 1;
}

/* Discount chips (inline in controls bar) */
.trading-meta-chips {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
}
.trading-discount-badge {
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.68rem;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    white-space: nowrap;
}
.trading-discount-badge.buy { background: rgba(34,197,94,0.15); color: #22c55e; }
.trading-discount-badge.sell { background: rgba(239,68,68,0.15); color: #ef4444; }

/* Controls bar: chrome strip wrapping the controls row */
.trading-controls-bar {
    position: relative;
    flex-shrink: 0;
    margin: 0 -0.75rem 0.75rem 0;
    padding: 0.4rem 1.5rem 0.4rem 0.75rem;
    background:
        linear-gradient(180deg,
            var(--color-surface-3) 0%,
            color-mix(in srgb, var(--color-surface-3) 100%, black 8%) 100%);
    box-shadow:
        inset 0 1px 0 var(--color-overlay-white-6),
        0 4px 12px -8px var(--color-overlay-black-70);
}
.trading-controls-bar::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg,
        transparent 0%,
        var(--border) 12%,
        var(--border) 88%,
        transparent 100%);
    pointer-events: none;
}
.trading-controls-row {
    display: flex;
    align-items: center;
    gap: 0.5rem 0.75rem;
    flex-wrap: wrap;
}
.trading-controls-row .trading-search-wrap {
    max-width: 18rem;
    flex: 1 1 14rem;
}
.trading-controls-row .trading-meta-chips {
    margin-left: auto;
}
/* Tier badges on item tiles */
.trading-item-meta-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
}
.trading-item-meta-row .trading-item-cat { flex: 0 1 auto; min-width: 0; }
.trading-item-tiers {
    display: inline-flex;
    gap: 0.2rem;
    flex-shrink: 0;
}
.trading-tier-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 0.95rem;
    padding: 0 0.25rem;
    border: 1px solid var(--accent-dim, var(--accent));
    border-radius: 3px;
    background: var(--color-accent-tint-12);
    color: var(--accent);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.02em;
}

/* Filter / sort menu buttons (controls bar) */
.trading-menu-wrap { position: relative; display: inline-flex; }
.trading-menu-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: 1.85rem;
    padding: 0 0.6rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--card);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    box-shadow: inset 0 1px 2px var(--color-overlay-black-40);
}
.trading-menu-btn:hover { color: var(--text); border-color: var(--text-secondary); }
.trading-menu-btn.active {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--color-accent-tint-12);
}
.trading-menu-btn.has-active { color: var(--text); }
.trading-menu-btn-label { max-width: 7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trading-menu-btn-dir {
    font-family: var(--mono);
    font-size: 0.6rem;
    color: var(--accent);
    margin-left: 0.1rem;
}
.trading-menu-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--color-black, #000);
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1;
}

/* Popover (used for both filter + sort) */
.trading-popover {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    z-index: 20;
    min-width: 14rem;
    max-width: 22rem;
    padding: 0.6rem;
    background: var(--color-surface-2, var(--card));
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 12px 28px -8px var(--color-overlay-black-70), 0 2px 6px var(--color-overlay-black-40);
}
.trading-popover--sort { min-width: 11rem; padding: 0.35rem; }
.trading-popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0 0.1rem 0.4rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.45rem;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
}
.trading-popover-clear {
    font-family: var(--font-display);
    font-size: 0.68rem;
    color: var(--accent);
    text-decoration: none;
    text-transform: none;
    letter-spacing: 0;
}
.trading-popover-clear:hover { text-decoration: underline; }
.trading-popover-group { margin-bottom: 0.55rem; }
.trading-popover-group:last-child { margin-bottom: 0; }
.trading-popover-label {
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    padding: 0.25rem 0.35rem;
}
.trading-popover-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.1rem;
}
.trading-popover-chip {
    padding: 0.2rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}
.trading-popover-chip:hover { color: var(--text); border-color: var(--text-secondary); }
.trading-popover-chip.active {
    background: var(--accent);
    color: var(--color-black, #000);
    border-color: var(--accent);
}
.trading-popover-chip.origin-nato.active { background: #4f8ef7; border-color: #4f8ef7; color: #fff; }
.trading-popover-chip.origin-wp.active { background: #ef4444; border-color: #ef4444; color: #fff; }
.trading-popover-empty {
    padding: 0.5rem;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.72rem;
}
.trading-popover-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.35rem;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    transition: background 0.12s;
}
.trading-popover-toggle:hover { background: var(--color-overlay-white-6); }
.trading-popover-toggle-label {
    font-family: var(--font-display);
    font-size: 0.74rem;
    font-weight: 500;
    color: var(--text);
}
.trading-popover-divider {
    height: 1px;
    background: var(--border);
    margin: 0.35rem 0;
}

/* Sort menu items */
.trading-sort-item {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.74rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
}
.trading-sort-item:hover { background: var(--color-overlay-white-6); }
.trading-sort-item.active { color: var(--accent); }
.trading-sort-check {
    display: inline-flex;
    justify-content: center;
    width: 0.9rem;
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--accent);
}

/* Active filter chip strip */
.trading-active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.4rem;
}
.trading-active-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.2rem 0.15rem 0.5rem;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--color-accent-tint-12);
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 500;
}
.trading-active-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.05rem;
    height: 1.05rem;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--accent);
    font-size: 0.85rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
}
.trading-active-chip-remove:hover { background: var(--accent); color: var(--color-black, #000); }
.trading-active-clear {
    font-family: var(--font-display);
    font-size: 0.68rem;
    color: var(--accent);
    text-decoration: none;
    margin-left: 0.25rem;
}
.trading-active-clear:hover { text-decoration: underline; }

/* Items grid */
.trading-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.5rem;
}
.trading-item-card {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    column-gap: 0.5rem;
    row-gap: 0.25rem;
    align-items: start;
    padding: 0.4rem 0.55rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: border-color 0.15s, background 0.15s;
    text-decoration: none;
    color: inherit;
    cursor: default;
}
.trading-item-card--linked {
    cursor: pointer;
}
.trading-item-card:hover { text-decoration: none; }
.trading-item-card--linked:hover {
    border-color: var(--accent);
    background: var(--color-overlay-white-6);
}
.trading-item-info { grid-column: 1; grid-row: 1; min-width: 0; }
.trading-item-name {
    font-family: var(--font-display);
    font-size: 0.78rem; font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.trading-item-cat {
    font-family: var(--font-display);
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* Prices row (now spans both columns under name+qty header) */
.trading-item-prices {
    grid-column: 1 / -1;
    grid-row: 2;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
}
.trading-price {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-size: 0.68rem;
    font-weight: 500;
}
.trading-price--buy { color: #22c55e; }
.trading-price--sell { color: #f59e0b; }
.trading-item-qty {
    grid-column: 2;
    grid-row: 1;
    align-self: start;
    justify-self: end;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent);
    line-height: 1.2;
}
.trading-item-prob {
    position: relative;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-size: 0.65rem;
    font-weight: 700;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 3px;
    padding: 0 0.3rem;
    min-width: 34px;
    text-align: center;
    line-height: 1.7;
}
.trading-item-prob--low {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.3);
}
.prob-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    background: currentColor;
    border-radius: 0 0 3px 3px;
    opacity: 0.5;
}

/* Conditions table */
.trading-conditions-table-wrap { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.trading-conditions-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.trading-conditions-table thead { position: sticky; top: 0; z-index: 2; }
.trading-conditions-table th {
    padding: 0.5rem 0.7rem; text-align: left; font-weight: 600;
    color: var(--text-secondary); background: var(--bg); border-bottom: 2px solid var(--border);
    font-family: var(--font-display);
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
}
.trading-conditions-table td { padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--border); }
.trading-conditions-table tbody tr:hover { background: var(--color-overlay-white-6); }
.trading-cond-row--linked { cursor: pointer; }
.trading-cond-row--linked:hover td:first-child .trading-cond-name { color: var(--accent); }
.trading-cond-row--unlinked .trading-cond-name { color: var(--text-secondary); }
.trading-cond-item { word-break: break-all; }
.trading-cond-name {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--text);
    display: block;
}
.trading-cond-id {
    font-family: var(--mono);
    font-size: 0.62rem; color: var(--text-secondary); opacity: 0.6; display: block;
}
.trading-cond-cat {
    display: inline-block;
    margin-top: 2px;
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
    background: var(--color-accent-tint-12);
    border-radius: 3px;
    padding: 0 0.35rem;
    line-height: 1.6;
}
.trading-cond-value { position: relative; min-width: 120px; }
.trading-mult-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); opacity: 0.1; border-radius: 2px; }
.trading-mult-label {
    position: relative;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-weight: 600; color: var(--accent); font-size: 0.75rem;
}

/* Empty / loading */
.trading-empty { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; }
.trading-loading { display: flex; justify-content: center; padding: 3rem; }

/* Scrollable content area */
.trading-content { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }

/* Responsive */
@media (max-width: 768px) {
    .trading-search-wrap,
    .trading-controls-row .trading-search-wrap {
        max-width: 100%;
        margin-left: 0;
        flex: 1 1 100%;
    }
    .trading-items-grid { grid-template-columns: 1fr; }

    /* Hide ambient discount chips on mobile to save room */
    .trading-meta-chips { display: none; }

    /* Trader pills: horizontal scroll instead of wrapping (would consume full viewport) */
    .trading-trader-pills {
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        margin: 0 -0.75rem;
        padding: 0 0.75rem;
        mask-image: linear-gradient(90deg,
            transparent 0,
            #000 0.75rem,
            #000 calc(100% - 1.5rem),
            transparent 100%);
        -webkit-mask-image: linear-gradient(90deg,
            transparent 0,
            #000 0.75rem,
            #000 calc(100% - 1.5rem),
            transparent 100%);
    }
    .trading-trader-pills::-webkit-scrollbar { display: none; }
    .trading-pill { flex-shrink: 0; }
}
</style>

