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

    <!-- Tab bar -->
    <div class="trading-tabs">
        <button class="trading-tab" :class="{ active: activeTab === 'supplies' }" @click="activeTab = 'supplies'">
            <LucidePackage :size="14" />
            {{ t('app_trading_supplies') }}
        </button>
        <button class="trading-tab" :class="{ active: activeTab === 'prices' }" @click="activeTab = 'prices'">
            <LucideArrowDownCircle :size="14" />
            {{ t('app_trading_prices') }}
        </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="trading-loading">
        <div class="loading-spinner"></div>
    </div>

    <!-- Controls bar: chrome strip outside the scroll region so it stays fixed -->
    <div class="trading-controls-bar" v-if="!loading && traderData">
        <div class="trading-controls-row">
            <template v-if="activeTab === 'supplies' && supplyKeys.length > 1">
                <div class="trading-tier-segment">
                    <button
                        v-for="key in supplyKeys"
                        :key="key"
                        class="trading-tier-btn"
                        :class="{ active: activeTier === key }"
                        @click="activeTier = key"
                    >
                        {{ tierLabel(key) }}
                    </button>
                </div>
                <select class="trading-tier-select" v-model="activeTier">
                    <option v-for="key in supplyKeys" :key="key" :value="key">{{ tierLabel(key) }}</option>
                </select>
                <label class="trading-exclusive-toggle" @click="exclusiveOnly = !exclusiveOnly" v-tooltip="t('app_trading_exclusive_only_tooltip')">
                    <span class="toggle-switch" :class="{ on: exclusiveOnly }">
                        <span class="toggle-knob"></span>
                    </span>
                    <span class="trading-exclusive-label">{{ t('app_trading_exclusive_only') }}</span>
                </label>
            </template>
            <div class="trading-meta-chips" v-if="traderData.discounts && traderData.discounts.length">
                <span v-for="d in traderData.discounts" :key="d[0]" class="trading-discount-badge" :class="d[0]">
                    {{ t('app_trading_discount_' + d[0]) || d[0] }} {{ (d[1] * 100).toFixed(0) }}%
                </span>
            </div>
            <div class="trading-search-wrap">
                <input
                    type="text"
                    class="trading-search"
                    v-model="searchQuery"
                    :placeholder="t('app_trading_search')"
                >
                <button v-if="searchQuery" class="trading-search-clear" @click="searchQuery = ''">&times;</button>
            </div>
        </div>
    </div>

    <!-- Content -->
    <div v-if="!loading && traderData" class="trading-content">
        <!-- Supplies tab -->
        <div v-if="activeTab === 'supplies'" class="trading-supplies">
            <div v-if="unlockCondition" class="trading-unlock-condition">
                <span class="trading-unlock-icon">🔒</span>
                <template v-for="(label, i) in unlockCondition" :key="i">
                    <span v-if="i > 0" class="trading-unlock-or">{{ t('app_trading_or') || 'OR' }}</span>
                    <span class="trading-unlock-badge">{{ label }}</span>
                </template>
            </div>
            <div class="trading-items-grid" v-if="filteredSupplyItems.length">
                <a
                    v-for="item in filteredSupplyItems"
                    :key="item[0]"
                    class="trading-item-card"
                    :class="{ 'trading-item-card--linked': !!resolveItem(item[0]) }"
                    href="#"
                    @click.prevent="resolveItem(item[0]) && $emit('navigateToItem', resolveItem(item[0]).id)"
                    @mouseenter="resolveItem(item[0]) && $emit('showItemHover', resolveItem(item[0]).id, $event)"
                    @mousemove="$emit('moveItemHover', $event)"
                    @mouseleave="$emit('hideItemHover')"
                >
                    <div class="trading-item-info">
                        <div class="trading-item-name">
                            {{ itemDisplayName(item[0]) }}
                        </div>
                        <div class="trading-item-cat">{{ categoryLabel(item[0]) }}</div>
                    </div>
                    <div class="trading-item-stats">
                        <span class="trading-item-qty">×{{ item[1] }}</span>
                        <span
                            class="trading-item-prob"
                            v-if="item[2] != null && item[2] < 1"
                            :class="{ 'trading-item-prob--low': item[2] < 0.5 }"
                        >
                            <span class="prob-bar" :style="{ width: (item[2] * 100) + '%' }"></span>
                            {{ (item[2] * 100).toFixed(0) }}%
                        </span>
                    </div>
                    <div class="trading-item-prices" v-if="buyPrice(item[0]) != null || sellPrice(item[0]) != null">
                        <span class="trading-price trading-price--buy" v-if="buyPrice(item[0]) != null">
                            <LucideArrowDownCircle :size="10" />{{ formatPrice(buyPrice(item[0])) }}
                        </span>
                        <span class="trading-price trading-price--sell" v-if="sellPrice(item[0]) != null">
                            <LucideArrowUpCircle :size="10" />{{ formatPrice(sellPrice(item[0])) }}
                        </span>
                    </div>
                </a>
            </div>
            <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
        </div>

        <!-- Prices tab -->
        <div v-if="activeTab === 'prices'" class="trading-conditions">
            <div class="trading-items-grid" v-if="priceItems.length">
                <a
                    v-for="item in priceItems"
                    :key="item.id"
                    class="trading-item-card"
                    :class="{ 'trading-item-card--linked': !!resolveItem(item.id) }"
                    href="#"
                    @click.prevent="resolveItem(item.id) && $emit('navigateToItem', resolveItem(item.id).id)"
                    @mouseenter="resolveItem(item.id) && $emit('showItemHover', resolveItem(item.id).id, $event)"
                    @mousemove="$emit('moveItemHover', $event)"
                    @mouseleave="$emit('hideItemHover')"
                >
                    <div class="trading-item-info">
                        <div class="trading-item-name">
                            {{ itemDisplayName(item.id) }}
                        </div>
                        <div class="trading-item-cat">{{ categoryLabel(item.id) }}</div>
                    </div>
                    <div class="trading-item-prices" v-if="buyPrice(item.id) != null || sellPrice(item.id) != null">
                        <span class="trading-price trading-price--buy" v-if="buyPrice(item.id) != null">
                            <LucideArrowDownCircle :size="10" />{{ formatPrice(buyPrice(item.id)) }}
                        </span>
                        <span class="trading-price trading-price--sell" v-if="sellPrice(item.id) != null">
                            <LucideArrowUpCircle :size="10" />{{ formatPrice(sellPrice(item.id)) }}
                        </span>
                    </div>
                </a>
            </div>
            <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
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
    inject: ['t', 'tName', 'tCat', 'tItemName'],
    emits: ['navigateToItem', 'showItemHover', 'moveItemHover', 'hideItemHover'],
    data() {
        return {
            traders: [],
            selectedTrader: null,
            traderData: null,
            loading: false,
            activeTab: 'supplies',
            activeTier: 'supplies_1',
            exclusiveOnly: false,
            searchQuery: '',
            cache: {},
            // Price lookup: id -> base cost (st_upgr_cost)
            priceById: {},
            // Tracks which category slugs have already been fetched for prices
            catPriceFetched: {},
            // Universal item data from items-common.json (id -> { name?, price? })
            itemsCommon: {},
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
        unlockCondition() {
            if (!this.traderData?.buy_supplies) return null;
            const match = this.traderData.buy_supplies.find(s => s[0] === this.activeTier);
            if (!match || !match[1]) return null;
            return this.parseCondition(match[1]);
        },
        currentSupplyItems() {
            if (!this.traderData) return [];
            return this.traderData[this.activeTier] || [];
        },
        exclusiveSupplyItems() {
            if (!this.traderData) return [];
            const currentIdx = this.supplyKeys.indexOf(this.activeTier);
            const priorIds = new Set(
                this.supplyKeys.slice(0, currentIdx)
                    .flatMap(k => (this.traderData[k] || []).map(item => item[0]))
            );
            return this.currentSupplyItems.filter(item => !priorIds.has(item[0]));
        },
        filteredSupplyItems() {
            const base = this.exclusiveOnly ? this.exclusiveSupplyItems : this.currentSupplyItems;
            const q = this.searchQuery.trim().toLowerCase();
            if (!q) return base;
            return base.filter(item => {
                if (item[0].toLowerCase().includes(q)) return true;
                const resolved = this.resolveItem(item[0]);
                if (resolved && this.tName(resolved).toLowerCase().includes(q)) return true;
                return false;
            });
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
        priceItems() {
            const buyMap = this.buyConditionMap;
            const sellMap = this.sellConditionMap;

            const ids = new Set();
            for (const key of this.supplyKeys) {
                for (const row of (this.traderData[key] || []))
                    ids.add(row[0]);
            }
            for (const id of Object.keys(buyMap))
                ids.add(id);

            const q = this.searchQuery.trim().toLowerCase();

            return [...ids]
                .map(id => ({ id, buy: buyMap[id] ?? null, sell: sellMap[id] ?? null }))
                .filter(({ id }) => {
                    if (!q) return true;
                    if (id.toLowerCase().includes(q)) return true;
                    const resolved = this.resolveItem(id);
                    return resolved && this.tName(resolved).toLowerCase().includes(q);
                })
                .sort((a, b) => this.itemDisplayName(a.id).localeCompare(this.itemDisplayName(b.id)));
        },
    },
    watch: {
        packId: {
            immediate: true,
            handler() { this.cache = {}; this.priceById = {}; this.catPriceFetched = {}; this.loadTradersMeta(); },
        },
        selectedTrader() {
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
            const cat = resolved && this.tCat(resolved.category);
            return cat || this.t('app_trading_cat_misc');
        },
        selectTrader(id) {
            this.selectedTrader = id;
            this.activeTier = 'supplies_1';
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
                this.resetTier();
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
                    this.resetTier();
                    this.prefetchPrices();
                }
            } catch (e) {
                console.error('Failed to load trader data:', e);
                this.traderData = null;
            } finally {
                this.loading = false;
            }
        },
        resetTier() {
            const keys = Object.keys(this.traderData || {})
                .filter(k => k.startsWith('supplies_'))
                .sort();
            this.activeTier = keys[0] || 'supplies_1';
            this.exclusiveOnly = false;
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

/* Tabs */
.trading-tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 0; }
.trading-tab {
    display: flex; align-items: center; gap: 0.35rem;
    padding: 0.55rem 1rem; background: none; border: none;
    border-bottom: 2px solid transparent; margin-bottom: -2px;
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.8rem; font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.trading-tab:hover { color: var(--text); }
.trading-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* Discount chips (now inline in controls bar) */
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
    margin-left: auto;
    max-width: 18rem;
}
.trading-tier-segment {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--card);
    padding: 2px;
    box-shadow: inset 0 1px 2px var(--color-overlay-black-40);
}
/* Compact tier <select> — desktop hides this, mobile swaps it in for the segment */
.trading-tier-select {
    display: none;
    height: 1.85rem;
    padding: 0 1.6rem 0 0.6rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background:
        linear-gradient(45deg, transparent 50%, var(--text-secondary) 50%) calc(100% - 0.7rem) 50% / 5px 5px no-repeat,
        var(--card);
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    box-shadow: inset 0 1px 2px var(--color-overlay-black-40);
}
.trading-tier-select:focus { outline: none; border-color: var(--accent); }
.trading-tier-btn {
    padding: 0.3rem 0.7rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 0.72rem; font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
}
.trading-tier-btn:hover { color: var(--text); }
.trading-tier-btn.active {
    background: var(--accent);
    color: var(--color-black);
    box-shadow: 0 1px 3px var(--color-overlay-black-50);
}

/* Exclusive-only toggle with inline label */
.trading-exclusive-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
}
.trading-exclusive-label {
    font-family: var(--font-display);
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    transition: color 0.15s;
}
.trading-exclusive-toggle:hover .trading-exclusive-label { color: var(--text); }

/* Unlock condition */
.trading-unlock-condition {
    display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem;
    padding: 0.25rem 0.5rem; background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.2); border-radius: 4px;
    margin-bottom: 0.5rem; font-size: 0.68rem;
}
.trading-unlock-icon { font-size: 0.8rem; flex-shrink: 0; opacity: 0.85; }
.trading-unlock-badge {
    padding: 0.1rem 0.4rem; background: rgba(245,158,11,0.15);
    border: 1px solid rgba(245,158,11,0.35); border-radius: 3px;
    color: #f59e0b;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
}
.trading-unlock-or { font-size: 0.6rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.05em; text-transform: uppercase; }

/* Items grid */
.trading-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.5rem;
}
.trading-item-card {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.55rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: border-color 0.15s, background 0.15s;
    text-decoration: none;
    color: inherit;
    cursor: default;
    gap: 0.2rem;
}
.trading-item-card--linked {
    cursor: pointer;
}
.trading-item-card:hover { text-decoration: none; }
.trading-item-card--linked:hover {
    border-color: var(--accent);
    background: var(--color-overlay-white-6);
}
.trading-item-info { flex: 1; min-width: 0; }
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
.trading-item-stats {
    display: flex; align-items: center; gap: 0.5rem;
    flex-shrink: 0;
}
/* Prices row */
.trading-item-prices {
    display: flex;
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
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
}
.trading-price--buy {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
}
.trading-price--sell {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.25);
}
.trading-item-qty {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "calt" 0;
    font-size: 0.72rem; font-weight: 600; color: var(--accent);
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

    /* Tier segment → compact select; hide ambient discount chips */
    .trading-tier-segment { display: none; }
    .trading-tier-select { display: inline-block; }
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

