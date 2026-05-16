<template>
<div class="trading-view" v-if="packId && traders.length">
    <div class="trading-layout">
        <!-- Left rail: faction-grouped trader directory -->
        <aside class="trading-rail">
            <div class="trading-rail-header">
                <span class="trading-rail-title">{{ t('app_trading_all_traders') || 'Traders' }}</span>
                <span class="trading-rail-count">{{ traders.length }}</span>
                <span class="trading-rail-actions">
                    <button
                        type="button"
                        class="trading-rail-action"
                        @click="setAllFactionsCollapsed(false)"
                        v-tooltip="t('app_label_expand_all') || 'Expand All'"
                        :aria-label="t('app_label_expand_all') || 'Expand All'"
                    >+</button>
                    <button
                        type="button"
                        class="trading-rail-action"
                        @click="setAllFactionsCollapsed(true)"
                        v-tooltip="t('app_label_collapse_all') || 'Collapse All'"
                        :aria-label="t('app_label_collapse_all') || 'Collapse All'"
                    >−</button>
                </span>
            </div>
            <div class="trading-rail-scroll">
                <div
                    v-for="group in factionGroups"
                    :key="group.faction"
                    class="trading-faction-group"
                >
                    <button
                        type="button"
                        class="trading-faction-header"
                        :class="{ collapsed: collapsedFactions[group.faction] }"
                        @click="toggleFaction(group.faction)"
                    >
                        <span class="trading-faction-chevron">▾</span>
                        <span class="trading-faction-name">{{ factionLabel(group.faction) }}</span>
                        <span class="trading-faction-count">{{ group.traders.length }}</span>
                    </button>
                    <div class="trading-faction-list" v-show="!collapsedFactions[group.faction]">
                        <button
                            v-for="trader in group.traders"
                            :key="trader.id"
                            type="button"
                            class="trading-rail-item"
                            :class="{ active: selectedTrader === trader.id }"
                            :style="{ '--trader-color': trader.color }"
                            @click="selectTrader(trader.id)"
                        >
                            <span class="trading-rail-item-stripe"></span>
                            <span class="trading-rail-item-dot"></span>
                            <span class="trading-rail-item-name">{{ traderName(trader) }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>

        <div class="trading-main">

    <!-- Loading state -->
    <div v-if="loading" class="trading-loading">
        <div class="loading-spinner"></div>
    </div>

    <!-- Scrollable content area: trader card + control strip stick to top, ledger scrolls beneath -->
    <div
        v-if="!loading && traderData"
        class="trading-content"
        :class="{ scrolled: compactHeader }"
        ref="scroller"
        @scroll.passive="onScroll"
    >
        <div class="trading-sticky">
            <!-- Trader header card (single-line identity strip) -->
            <header
                v-if="selectedTraderObj"
                class="trading-trader-card"
                :style="{ '--trader-color': selectedTraderObj.color }"
            >
                <span class="trading-trader-card-bar"></span>
                <div class="trading-trader-card-id">
                    <div class="trading-trader-card-name">{{ traderName(selectedTraderObj) }}</div>
                    <div class="trading-trader-card-sub">
                        <span class="trading-trader-card-faction">{{ factionLabel(factionOf(selectedTraderObj.id)) }}</span>
                        <span class="trading-trader-card-stock" v-if="stockedCount">
                            <span class="trading-trader-card-dot">·</span>
                            <span class="trading-trader-card-stock-n">{{ stockedCount }}</span>
                            {{ t('app_trading_in_stock') || 'in stock' }}
                        </span>
                        <span class="trading-trader-card-origins" v-if="originCounts.wp || originCounts.nato">
                            <span class="trading-trader-card-dot">·</span>
                            <span v-if="originCounts.wp" class="trading-trader-origin trading-trader-origin--wp">
                                <span class="trading-trader-origin-dot"></span>
                                <span class="trading-trader-origin-n">{{ originCounts.wp }}</span>
                                WP
                            </span>
                            <span v-if="originCounts.nato" class="trading-trader-origin trading-trader-origin--nato">
                                <span class="trading-trader-origin-dot"></span>
                                <span class="trading-trader-origin-n">{{ originCounts.nato }}</span>
                                NATO
                            </span>
                        </span>
                    </div>
                </div>
                <div class="trading-trader-card-rates" v-if="hasRates">
                    <div class="trading-rate">
                        <span class="trading-rate-label">{{ compactHeader ? (t('app_trading_sell') || 'Sell') : (t('app_trading_you_sell_at') || 'You sell at') }}</span>
                        <span class="trading-rate-value" :class="rateClass(discountMap.buy, 'sell')">
                            {{ formatMultiplier(discountMap.buy) }}<span class="trading-rate-x">×</span>
                        </span>
                    </div>
                    <div class="trading-rate">
                        <span class="trading-rate-label">{{ compactHeader ? (t('app_trading_buy') || 'Buy') : (t('app_trading_you_buy_at') || 'You buy at') }}</span>
                        <span class="trading-rate-value" :class="rateClass(discountMap.sell, 'buy')">
                            {{ formatMultiplier(discountMap.sell) }}<span class="trading-rate-x">×</span>
                        </span>
                    </div>
                </div>
            </header>

            <!-- Strip row A: search + filters, matching the item-page filter-bar pattern -->
            <div class="trading-strip-controls">
                <div class="filter-input-group trading-filter-group" v-click-outside="closeFilterPanel">
                    <LucideSearch class="filter-input-icon" :size="14" />
                    <input
                        type="text"
                        v-model="searchQuery"
                        :placeholder="t('app_trading_search')"
                    >
                    <button v-if="searchQuery" class="filter-input-clear" @click="searchQuery = ''">&times;</button>
                    <button
                        class="filter-btn"
                        @click.stop="filterPanelOpen = !filterPanelOpen"
                        v-tooltip="t('app_label_filters')"
                    >
                        <LucideSlidersHorizontal :size="14" />
                        <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
                    </button>
                    <div class="filter-panel trading-filter-panel" v-show="filterPanelOpen" @click.stop>
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
                        <label
                            class="trading-popover-toggle"
                            @click="hideMisc = !hideMisc"
                        >
                            <span class="toggle-switch" :class="{ on: hideMisc }">
                                <span class="toggle-knob"></span>
                            </span>
                            <span class="trading-popover-toggle-label">{{ t('app_trading_hide_misc') || 'Hide Misc. items' }}</span>
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
            <!-- Active filter chips: shown directly below the search/filter bar, like item pages -->
            <div v-if="activeFilterCount > 0" class="active-filters">
                <span v-for="key in selectedTiers" :key="'t-' + key" class="active-filter-chip">
                    <span class="active-filter-label">{{ t('app_trading_filter_level') }}: {{ tierLabel(key) }}</span>
                    <button class="active-filter-remove" @click="toggleTier(key)">&times;</button>
                </span>
                <span v-for="cat in selectedCategories" :key="'c-' + cat" class="active-filter-chip">
                    <span class="active-filter-label">{{ t('app_trading_filter_category') }}: {{ tCat(cat) || cat }}</span>
                    <button class="active-filter-remove" @click="toggleCategory(cat)">&times;</button>
                </span>
                <span v-for="o in selectedOrigins" :key="'o-' + o" class="active-filter-chip">
                    <span class="active-filter-label">{{ t('app_filter_origin') }}: {{ originLabel(o) }}</span>
                    <button class="active-filter-remove" @click="toggleOrigin(o)">&times;</button>
                </span>
                <a href="#" class="filter-clear-inline" @click.prevent="clearAllFilters">{{ t('app_label_clear_all') }}</a>
            </div>

            </div>
            <!-- Strip row B: column header labels, clickable for sort -->
            <div class="trading-ledger-header" role="row">
                <span class="ledger-col-tier"></span>
                <button
                    type="button"
                    class="ledger-col-name ledger-col-sort"
                    :class="{ 'is-active': sortKey === 'name' }"
                    @click="toggleSort('name')"
                >
                    {{ t('app_trading_item') }}
                    <span class="ledger-sort-arrow">{{ sortArrow('name') }}</span>
                </button>
                <button
                    type="button"
                    class="ledger-col-qty ledger-col-sort"
                    :class="{ 'is-active': sortKey === 'qty' }"
                    @click="toggleSort('qty')"
                >
                    {{ t('app_trading_quantity') }}
                    <span class="ledger-sort-arrow">{{ sortArrow('qty') }}</span>
                </button>
                <button
                    type="button"
                    class="ledger-col-buy ledger-col-sort"
                    :class="{ 'is-active': sortKey === 'buy' }"
                    @click="toggleSort('buy')"
                >
                    {{ t('app_trading_discount_buy') }} <span class="ledger-unit">₽</span>
                    <span class="ledger-sort-arrow">{{ sortArrow('buy') }}</span>
                </button>
                <button
                    type="button"
                    class="ledger-col-sell ledger-col-sort"
                    :class="{ 'is-active': sortKey === 'sell' }"
                    @click="toggleSort('sell')"
                >
                    {{ t('app_trading_discount_sell') }} <span class="ledger-unit">₽</span>
                    <span class="ledger-sort-arrow">{{ sortArrow('sell') }}</span>
                </button>
            </div>
        </div>

        <div class="trading-ledger" v-if="filteredItems.length">
            <a
                v-for="entry in filteredItems"
                :key="entry.id"
                class="trading-ledger-row"
                :class="{ 'trading-ledger-row--linked': !!resolveItem(entry.id) }"
                href="#"
                @click.prevent="resolveItem(entry.id) && $emit('navigateToItem', resolveItem(entry.id).id)"
                @mouseenter="resolveItem(entry.id) && $emit('showItemHover', resolveItem(entry.id).id, { clientX: $event.clientX, clientY: $event.clientY })"
                @mousemove="$emit('moveItemHover', { clientX: $event.clientX, clientY: $event.clientY })"
                @mouseleave="$emit('hideItemHover')"
            >
                <span class="ledger-col-tier">
                    <span
                        v-if="entry.tiers.length"
                        class="ledger-tier"
                        v-tooltip="tierTooltip(entry.tiers[0])"
                    >{{ tierBadgeShort(entry.tiers[0]) }}</span>
                </span>
                <span class="ledger-col-name">
                    <span class="ledger-name-text">{{ itemDisplayName(entry.id) }}</span>
                    <span class="ledger-cat">{{ categoryLabel(entry.id) }}</span>
                </span>
                <span class="ledger-col-qty">
                    <span v-if="entry.qty != null" class="ledger-qty">×{{ entry.qty }}</span>
                    <span
                        v-if="entry.prob != null && entry.prob < 1"
                        class="ledger-prob"
                        :class="{ 'ledger-prob--low': entry.prob < 0.5 }"
                    >{{ (entry.prob * 100).toFixed(0) }}%</span>
                </span>
                <span class="ledger-col-buy">
                    <span v-if="buyPrice(entry.id) != null" class="ledger-price ledger-price--buy">{{ formatPriceBare(buyPrice(entry.id)) }}</span>
                    <span v-else class="ledger-price-empty">—</span>
                </span>
                <span class="ledger-col-sell">
                    <span v-if="sellPrice(entry.id) != null" class="ledger-price ledger-price--sell">{{ formatPriceBare(sellPrice(entry.id)) }}</span>
                    <span v-else class="ledger-price-empty">—</span>
                </span>
            </a>
        </div>
        <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
    </div>
        </div>
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
            hideMisc: true,
            filterPanelOpen: false,
            sortKey: 'name',
            sortAsc: true,
            collapsedFactions: {},
            stickyScrolled: false,
            narrowViewport: false,
        };
    },
    computed: {
        displayTraders() {
            return [...this.traders].sort((a, b) =>
                this.traderName(a).localeCompare(this.traderName(b))
            );
        },
        selectedTraderObj() {
            return this.traders.find(t => t.id === this.selectedTrader) || null;
        },
        factionGroups() {
            const ORDER = ['loner', 'duty', 'freedom', 'ecolog', 'military', 'mercenary', 'bandit', 'monolith', 'csky', 'sin', 'isg', 'generic', 'other'];
            const groups = new Map();
            for (const t of this.traders) {
                const f = this.factionOf(t.id);
                if (!groups.has(f)) groups.set(f, []);
                groups.get(f).push(t);
            }
            const out = [];
            for (const f of ORDER) {
                if (!groups.has(f)) continue;
                const list = groups.get(f).sort((a, b) =>
                    this.traderName(a).localeCompare(this.traderName(b))
                );
                out.push({ faction: f, traders: list });
                groups.delete(f);
            }
            for (const [f, list] of groups) {
                out.push({ faction: f, traders: list });
            }
            return out;
        },
        stockedCount() {
            return this.allEntries.filter(e => e.stocked).length;
        },
        originCounts() {
            const c = { nato: 0, wp: 0 };
            for (const e of this.allEntries) {
                if (!e.stocked) continue;
                const f = this.originById[e.id];
                if (!Array.isArray(f)) continue;
                if (f.includes('nato')) c.nato++;
                if (f.includes('wp')) c.wp++;
            }
            return c;
        },
        hasRates() {
            return !!(this.traderData?.discounts && this.traderData.discounts.length);
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
                if (this.hideMisc && !this.resolveItem(entry.id)) return false;
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
        // Trader-header compact mode: forced on once the ledger has scrolled past the hysteresis
        // band, or whenever the viewport is too narrow to fit the expanded card without bulky
        // wrapping. Drives both the .scrolled CSS class and the short Sell/Buy rate labels.
        compactHeader() {
            return this.stickyScrolled || this.narrowViewport;
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
            // Reset scroll + expanded header when switching trader, regardless of cache hit.
            this.stickyScrolled = false;
            this.$nextTick(() => {
                if (this.$refs.scroller) this.$refs.scroller.scrollTop = 0;
            });
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
        formatPriceBare(val) {
            if (val == null) return null;
            return val.toLocaleString();
        },
        tierBadgeShort(key) {
            if (key === 'supplies_generic') return 'G';
            return key.replace('supplies_', '');
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
        factionOf(id) {
            const FACTION_PREFIX = {
                bandit: 'bandit',
                csky: 'csky',
                duty: 'duty',
                ecolog: 'ecolog',
                freedom: 'freedom',
                generic: 'generic',
                greh: 'sin',
                isg: 'isg',
                mercenary: 'mercenary',
                military: 'military',
                monolith: 'monolith',
                stalker: 'loner',
            };
            const prefix = id.split('_')[0];
            return FACTION_PREFIX[prefix] || 'other';
        },
        factionLabel(f) {
            const FACTION_LABEL_KEY = {
                loner: 'app_faction_stalker',
                duty: 'app_faction_duty',
                freedom: 'app_faction_freedom',
                ecolog: 'app_faction_ecolog',
                military: 'app_faction_military',
                mercenary: 'app_faction_mercenary',
                bandit: 'app_faction_bandit',
                monolith: 'app_faction_monolith',
                csky: 'app_faction_clear_sky',
                sin: 'app_faction_greh',
                isg: 'app_faction_isg',
            };
            const FALLBACK = {
                loner: 'Loners', duty: 'Duty', freedom: 'Freedom', ecolog: 'Ecologists',
                military: 'Military', mercenary: 'Mercenaries', bandit: 'Bandits',
                monolith: 'Monolith', csky: 'Clear Sky', sin: 'Sin', isg: 'ISG',
                generic: 'Generic', other: 'Other',
            };
            const key = FACTION_LABEL_KEY[f];
            if (key) {
                const v = this.t(key);
                if (v && v !== key) return v;
            }
            return FALLBACK[f] || f;
        },
        toggleFaction(f) {
            this.collapsedFactions = {
                ...this.collapsedFactions,
                [f]: !this.collapsedFactions[f],
            };
        },
        setAllFactionsCollapsed(collapsed) {
            const next = {};
            for (const g of this.factionGroups) next[g.faction] = collapsed;
            this.collapsedFactions = next;
        },
        initDefaultCollapsedFactions() {
            const selectedFaction = this.selectedTrader ? this.factionOf(this.selectedTrader) : null;
            const next = {};
            for (const g of this.factionGroups) {
                next[g.faction] = g.faction !== 'loner' && g.faction !== selectedFaction;
            }
            this.collapsedFactions = next;
        },
        formatMultiplier(v) {
            if (v == null || isNaN(v)) return '—';
            return v.toFixed(2);
        },
        rateClass(v, kind) {
            if (v == null || isNaN(v)) return '';
            // kind='sell' → player sells (higher = better for player)
            // kind='buy'  → player buys  (lower  = better for player)
            const good = kind === 'sell' ? v >= 1 : v <= 1;
            const bad  = kind === 'sell' ? v < 0.5 : v > 1.5;
            if (good) return 'trading-rate-value--good';
            if (bad)  return 'trading-rate-value--bad';
            return 'trading-rate-value--mid';
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
                greh: 'Sin', isg: 'ISG',
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
            this.initDefaultCollapsedFactions();
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
            this.hideMisc = true;
        },
        closeFilterPanel() { this.filterPanelOpen = false; },
        toggleSort(field) {
            if (this.sortKey === field) {
                this.sortAsc = !this.sortAsc;
            } else {
                this.sortKey = field;
                this.sortAsc = true;
            }
        },
        sortArrow(field) {
            if (this.sortKey !== field) return '';
            return this.sortAsc ? '▲' : '▼';
        },
        onScroll(ev) {
            this.$emit('hideItemHover');
            // Hysteresis: the card collapse changes the sticky stack's height, which can
            // nudge scrollTop back across a single threshold and cause flicker. Use separate
            // enter/exit thresholds so once collapsed the card stays collapsed until you're
            // genuinely back near the top.
            const top = ev.target.scrollTop;
            if (!this.stickyScrolled && top > 32) this.stickyScrolled = true;
            else if (this.stickyScrolled && top < 4) this.stickyScrolled = false;
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
    mounted() {
        // Track narrow viewport so the trader header renders in its compact form on phones
        // (same treatment as the scrolled state, with short Sell/Buy labels).
        if (typeof window !== 'undefined' && window.matchMedia) {
            this._narrowMq = window.matchMedia('(max-width: 540px)');
            this._narrowMqHandler = (e) => { this.narrowViewport = e.matches; };
            this.narrowViewport = this._narrowMq.matches;
            this._narrowMq.addEventListener('change', this._narrowMqHandler);
        }
    },
    beforeUnmount() {
        if (this._narrowMq && this._narrowMqHandler) {
            this._narrowMq.removeEventListener('change', this._narrowMqHandler);
        }
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
/* Sticky stack: wraps trader card + search/filter strip + column header + active chips.
   Lives inside the scroll container so all four pieces remain anchored when rows scroll. */
.trading-sticky {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--color-surface-1, var(--card));
}
.trading-sticky .trading-ledger-header {
    border-radius: 0;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
}

/* Strip row A: reuses the global .filter-input-group chrome from FilterBar (search icon, input,
   clear button, filters icon-button with badge). The trader-specific wrapper just adds spacing
   and the sticky-block border treatment. */
.trading-strip-controls {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.4rem 0.65rem;
    background:
        linear-gradient(180deg,
            var(--color-surface-3) 0%,
            color-mix(in srgb, var(--color-surface-3) 100%, black 8%) 100%);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
}
.trading-filter-group { width: 100%; max-width: none; }
/* Active-filters chip strip inside the trader strip-controls: tighten top margin so it
   hugs the search bar (item-page rule has margin-top: 0.4rem inherited from .filter-bar context). */
.trading-strip-controls .active-filters { margin-top: 0; padding-right: 0; }
/* Drop the filter panel BELOW the input group, not on top of it (the item-page default).
   Anchor to the left of the input group so it never clips the viewport's right edge. */
.trading-filter-panel {
    top: calc(100% + 0.35rem);
    left: 0;
    right: auto;
    min-width: 18rem;
    max-width: min(24rem, calc(100vw - 1rem));
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

/* Filter panel internal styles (reused inside .filter-panel via .trading-filter-panel). */
.trading-filter-panel { padding: 0.6rem; }
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
.trading-popover-chip.origin-wp.active { background: #b91c1c; border-color: #b91c1c; color: #fff; }
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
/* Ledger (item list). --ledger-cols is hoisted to .trading-content so the sticky header
   (now a sibling of .trading-ledger, not a child) shares the same column grid as the rows. */
.trading-content {
    --ledger-cols: 1.6rem minmax(0, 1fr) 5rem 5.5rem 5.5rem;
}
.trading-ledger {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    background: var(--card);
    overflow: hidden;
}
.trading-ledger-header,
.trading-ledger-row {
    display: grid;
    grid-template-columns: var(--ledger-cols);
    align-items: center;
    column-gap: 0.5rem;
    padding: 0 0.65rem;
}
.trading-ledger-header {
    height: 1.7rem;
    background:
        linear-gradient(180deg,
            var(--color-surface-3) 0%,
            color-mix(in srgb, var(--color-surface-3) 100%, black 8%) 100%);
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
}

/* Sortable column header cells (replace the old dedicated Sort menu). */
.ledger-col-sort {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    margin: 0;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    height: 100%;
    transition: color 0.12s;
}
.trading-ledger-header .ledger-col-sort.ledger-col-qty,
.trading-ledger-header .ledger-col-sort.ledger-col-buy,
.trading-ledger-header .ledger-col-sort.ledger-col-sell {
    justify-content: flex-end;
}
.ledger-col-sort:hover { color: var(--text); }
.ledger-col-sort.is-active { color: var(--accent); }
.ledger-sort-arrow {
    display: inline-block;
    min-width: 0.6rem;
    font-family: var(--mono);
    font-size: 0.62rem;
    color: var(--accent);
    letter-spacing: 0;
}
.trading-ledger-header .ledger-unit {
    font-family: var(--mono);
    font-size: 0.62rem;
    font-weight: 400;
    margin-left: 0.1rem;
    color: var(--accent);
    letter-spacing: 0;
    opacity: 0.8;
}
.trading-ledger-row {
    height: 1.85rem;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    color: inherit;
    text-decoration: none;
    cursor: default;
    transition: background 0.1s;
}
.trading-ledger-row:last-child { border-bottom: none; }
.trading-ledger-row--linked { cursor: pointer; }
.trading-ledger-row:hover { text-decoration: none; }
.trading-ledger-row--linked:hover {
    background: var(--color-overlay-white-6);
}

/* Columns */
.ledger-col-tier {
    display: flex;
    align-items: center;
    justify-content: center;
}
.ledger-col-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    font-family: var(--font-display);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text);
    letter-spacing: 0.01em;
}
.ledger-name-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ledger-cat {
    flex-shrink: 0;
    font-family: var(--font-display);
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    opacity: 0.55;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 8rem;
}
.trading-ledger-row:hover .ledger-cat { opacity: 0.85; }
.ledger-col-qty,
.ledger-col-buy,
.ledger-col-sell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1, "calt" 0;
    font-size: 0.72rem;
    font-weight: 400;
    white-space: nowrap;
}
.trading-ledger-header .ledger-col-name,
.trading-ledger-header .ledger-col-qty,
.trading-ledger-header .ledger-col-buy,
.trading-ledger-header .ledger-col-sell {
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.1em;
    text-transform: uppercase;
}
.trading-ledger-header .ledger-col-name { gap: 0.25rem; }

/* Tier marker (dim outline, no fill) */
.ledger-tier {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.05rem;
    height: 0.95rem;
    padding: 0 0.2rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-secondary);
    line-height: 1;
}
.trading-ledger-row:hover .ledger-tier {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
}

/* Quantity / probability cluster */
.ledger-qty {
    color: var(--accent);
    font-weight: 500;
}
.ledger-prob {
    font-size: 0.62rem;
    font-weight: 600;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 3px;
    padding: 0 0.25rem;
    line-height: 1.4;
}
.ledger-prob--low {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.3);
}

/* Prices */
.ledger-price {
    font-weight: 500;
}
.ledger-price--buy  { color: #22c55e; }
.ledger-price--sell { color: #b45309; }
.ledger-price-empty {
    color: var(--text-secondary);
    opacity: 0.35;
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
.trading-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    /* Disable browser scroll-anchoring: when the sticky trader card collapses, the content
       below shrinks by ~34px. With anchoring on, the browser nudges scrollTop to keep the
       first visible non-sticky element in place, which pushes scrollTop back across the
       hysteresis band and causes the card to re-expand → flicker loop. */
    overflow-anchor: none;
}

/* ── Two-column layout: faction rail + main column ── */
.trading-layout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 13rem 1fr;
    gap: 0.75rem;
    overflow: hidden;
}
.trading-main {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* ── Faction rail ── */
.trading-rail {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-surface-1, var(--card));
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: inset 0 1px 0 var(--color-overlay-white-6);
    overflow: hidden;
}
.trading-rail-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.5rem 0.45rem 0.75rem;
    border-bottom: 1px solid var(--border);
    background:
        linear-gradient(180deg,
            var(--color-surface-3) 0%,
            color-mix(in srgb, var(--color-surface-3) 100%, black 8%) 100%);
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text-secondary);
}
.trading-rail-title { flex: 0 0 auto; }
.trading-rail-count {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 0.65rem;
    color: var(--accent);
    letter-spacing: 0;
    margin-right: auto;
}
.trading-rail-actions {
    display: inline-flex;
    gap: 0.15rem;
    align-items: center;
}
.trading-rail-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--card);
    color: var(--text-secondary);
    font-family: var(--mono);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
    padding: 0;
}
.trading-rail-action:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--color-accent-tint-12);
}
.trading-rail-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.35rem 0;
}
.trading-faction-group { margin-bottom: 0.2rem; }
.trading-faction-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.3rem 0.75rem 0.3rem 0.4rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    text-align: left;
    transition: color 0.12s;
}
.trading-faction-header:hover { color: var(--text); }
.trading-faction-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    font-size: 0.9rem;
    line-height: 1;
    color: var(--accent);
    transition: transform 0.18s ease, color 0.12s;
}
.trading-faction-header:hover .trading-faction-chevron { color: var(--accent); }
.trading-faction-header.collapsed .trading-faction-chevron {
    transform: rotate(-90deg);
    color: var(--text-secondary);
}
.trading-faction-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trading-faction-count {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-size: 0.6rem;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0;
    opacity: 0.7;
}
.trading-faction-list {
    display: flex;
    flex-direction: column;
    position: relative;
}
.trading-faction-list::before {
    content: "";
    position: absolute;
    left: 0.9rem;
    top: 0.15rem;
    bottom: 0.15rem;
    width: 1px;
    background: var(--border);
    opacity: 0.7;
    pointer-events: none;
}
.trading-rail-item {
    --trader-color: var(--accent);
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.35rem 0.75rem 0.35rem 1.4rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    cursor: pointer;
    text-align: left;
    transition: color 0.12s, background 0.12s;
}
.trading-rail-item-stripe {
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: var(--trader-color);
    opacity: 0;
    transition: opacity 0.12s;
}
.trading-rail-item-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--trader-color);
    opacity: 0.55;
    flex-shrink: 0;
    transition: opacity 0.12s, box-shadow 0.12s;
}
.trading-rail-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.trading-rail-item:hover {
    color: var(--text);
    background: var(--color-overlay-white-6);
}
.trading-rail-item:hover .trading-rail-item-stripe { opacity: 0.5; }
.trading-rail-item:hover .trading-rail-item-dot { opacity: 1; }
.trading-rail-item.active {
    color: var(--text);
    background: linear-gradient(90deg,
        color-mix(in srgb, var(--trader-color) 14%, transparent) 0%,
        transparent 70%);
}
.trading-rail-item.active .trading-rail-item-stripe { opacity: 1; }
.trading-rail-item.active .trading-rail-item-dot {
    opacity: 1;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--trader-color) 30%, transparent);
}

/* ── Trader header card ── two-line at rest: large NAME + sub line (faction · stock · origins) +
   2-line rate boxes. Visually a separate card above the controls panel. Collapses to a single
   slim row when the user scrolls the ledger. */
.trading-trader-card {
    --trader-color: var(--accent);
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.55rem 0.85rem 0.55rem 0.95rem;
    margin-bottom: 0.5rem;
    background:
        linear-gradient(90deg,
            color-mix(in srgb, var(--trader-color) 8%, var(--color-surface-2, var(--card))) 0%,
            var(--color-surface-2, var(--card)) 60%);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: inset 0 1px 0 var(--color-overlay-white-6);
    overflow: hidden;
    transition: padding 0.18s ease, margin-bottom 0.18s ease, gap 0.18s ease;
}
/* Scrolled state: compress the card down to one slim row that stays anchored at the top. */
.trading-content.scrolled .trading-trader-card { padding: 0.35rem 0.95rem 0.35rem 1.05rem; margin-bottom: 0.35rem; gap: 0.6rem; }
.trading-content.scrolled .trading-trader-card-id {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
    overflow: hidden;
}
.trading-content.scrolled .trading-trader-card-name { font-size: 0.78rem; }
.trading-content.scrolled .trading-trader-card-sub { margin-top: 0; flex-wrap: nowrap; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; align-items: center; }
.trading-content.scrolled .trading-rate { flex-direction: row; align-items: center; gap: 0.5rem; padding: 0.25rem 0.65rem; min-width: 0; }
.trading-content.scrolled .trading-rate-value { font-size: 0.72rem; }
.trading-content.scrolled .trading-rate-label { font-size: 0.45rem; letter-spacing: 0.08em; }
/* Collapsed: hide the noisier sub-line entries (stock count, WP/NATO origin counts) to keep the bar short. */
.trading-content.scrolled .trading-trader-card-stock,
.trading-content.scrolled .trading-trader-card-origins { display: none; }
.trading-trader-card-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--trader-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--trader-color) 55%, transparent);
}
.trading-trader-card-id { flex: 1; min-width: 0; }
.trading-trader-card-name {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--text);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.1;
    transition: font-size 0.18s ease;
}
.trading-trader-card-sub {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    margin-top: 0.15rem;
    font-family: var(--font-display);
    font-size: 0.68rem;
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    flex-wrap: wrap;
}
.trading-trader-card-faction {
    font-weight: 700;
    color: var(--trader-color);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.65rem;
}
.trading-trader-card-dot { opacity: 0.5; }
.trading-trader-card-stock-n {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--text);
    font-weight: 600;
}
.trading-trader-card-origins {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
}
.trading-trader-origin {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
}
.trading-trader-origin-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
}
.trading-trader-origin-n {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0;
}
/* Match the WP / NATO origin badge palette used on item-view badges. */
.trading-trader-origin--wp   .trading-trader-origin-dot { background: var(--color-accent-tan); }
.trading-trader-origin--wp                              { color: var(--color-accent-tan); }
.trading-trader-origin--nato .trading-trader-origin-dot { background: var(--color-teal); }
.trading-trader-origin--nato                            { color: var(--color-teal); }
.trading-trader-card-rates {
    display: flex;
    gap: 0.45rem;
    flex-shrink: 0;
}
.trading-rate {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    padding: 0.3rem 0.6rem;
    min-width: 5.25rem;
    background: color-mix(in srgb, var(--color-overlay-black-40) 100%, transparent);
    border: 1px solid var(--border);
    border-radius: 4px;
    transition: padding 0.18s ease, min-width 0.18s ease, gap 0.18s ease;
}
.trading-rate-label {
    font-family: var(--font-display);
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-secondary);
    transition: font-size 0.18s ease;
}
.trading-rate-value {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1;
    color: var(--text);
    letter-spacing: -0.01em;
    transition: font-size 0.18s ease;
}
.trading-rate-x {
    font-size: 0.7em;
    margin-left: 0.05em;
    opacity: 0.55;
    font-weight: 400;
}
.trading-rate-value--good { color: #22c55e; }
.trading-rate-value--mid  { color: var(--text); }
.trading-rate-value--bad  { color: #b91c1c; }

/* Responsive */
@media (max-width: 768px) {
    .trading-search-wrap {
        max-width: 100%;
        margin-left: 0;
        flex: 1 1 100%;
    }
    /* Ledger: drop the sell column on narrow viewports */
    .trading-content {
        --ledger-cols: 1.4rem minmax(0, 1fr) 4rem 5rem;
    }
    .trading-ledger .ledger-col-sell,
    .trading-ledger-header .ledger-col-sell {
        display: none;
    }
    .ledger-cat { display: none; }

    /* Stack rail above main on narrow viewports — and flatten it into a single horizontal
       scrollable strip of trader chips so it doesn't eat vertical space.
       minmax(0, 1fr) prevents the chip list's intrinsic min-content from pushing the grid
       track wider than the viewport. */
    .trading-layout {
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto minmax(0, 1fr);
        gap: 0.5rem;
    }
    .trading-rail {
        max-height: none;
        height: auto;
        flex-direction: row;
        min-width: 0;
        overflow: hidden;
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
    }
    .trading-rail-header { display: none; }
    .trading-rail-scroll {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.35rem 0 0.35rem 0;
        gap: 0.35rem;
        -webkit-overflow-scrolling: touch;
        min-width: 0;
        width: 100%;
        /* Hide scrollbar */
        scrollbar-width: none;
        /* Fade the right edge to hint that more chips lie beyond. */
        -webkit-mask-image: linear-gradient(to right, black calc(100% - 28px), transparent);
        mask-image: linear-gradient(to right, black calc(100% - 28px), transparent);
    }
    .trading-rail-scroll::-webkit-scrollbar { display: none; }
    /* Flatten faction-group + faction-list so trader chips become direct flex children of
       rail-scroll (single horizontal row). !important on the list overrides v-show's inline
       display:none for any factions a user previously collapsed in desktop mode. */
    .trading-faction-group { display: contents; }
    .trading-faction-header { display: none; }
    .trading-faction-list { display: contents !important; }
    .trading-faction-list::before { display: none; }
    .trading-rail-item {
        flex: 0 0 auto;
        width: auto;
        padding: 0.3rem 0.7rem 0.3rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--color-surface-1, var(--card));
        font-size: 0.72rem;
        white-space: nowrap;
    }
    .trading-rail-item-stripe { display: none; }
    .trading-rail-item.active {
        background: color-mix(in srgb, var(--trader-color) 16%, var(--color-surface-1, var(--card)));
        border-color: var(--trader-color);
    }

    /* Trader card: keep identity + rates on one line if they fit; only wrap rates to a
       second line when the viewport is too narrow. */
    .trading-trader-card {
        flex-wrap: wrap;
        row-gap: 0.4rem;
    }
    .trading-trader-card-id { flex: 1 1 12rem; }
    .trading-trader-card-rates { flex: 0 0 auto; }
}

/* Progressive sub-line hiding for the trader header on smaller screens. Origins drop first
   (lowest signal), then the in-stock count, leaving just NAME + faction on tiny phones. */
@media (max-width: 540px) {
    .trading-trader-card-origins { display: none; }
}
@media (max-width: 420px) {
    .trading-trader-card-stock { display: none; }
}
</style>

