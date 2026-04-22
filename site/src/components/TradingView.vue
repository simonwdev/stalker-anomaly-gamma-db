<template>
<div class="trading-view" v-if="packId">
    <!-- Trader selector pills -->
    <div class="trading-toolbar">
        <div class="trading-trader-pills">
            <button
                v-for="trader in traders"
                :key="trader.id"
                class="trading-pill"
                :class="{ active: selectedTrader === trader.id }"
                @click="selectTrader(trader.id)"
            >
                <span class="trading-pill-dot" :style="{ background: trader.color }"></span>
                {{ t(trader.labelKey) || trader.label }}
            </button>
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

    <!-- Tab bar -->
    <div class="trading-tabs">
        <button class="trading-tab" :class="{ active: activeTab === 'supplies' }" @click="activeTab = 'supplies'">
            <LucidePackage :size="14" />
            {{ t('app_trading_supplies') }}
        </button>
        <button class="trading-tab" :class="{ active: activeTab === 'buy' }" @click="activeTab = 'buy'">
            <LucideArrowDownCircle :size="14" />
            {{ t('app_trading_buy_conditions') }}
        </button>
        <button class="trading-tab" :class="{ active: activeTab === 'sell' }" @click="activeTab = 'sell'">
            <LucideArrowUpCircle :size="14" />
            {{ t('app_trading_sell_conditions') }}
        </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="trading-loading">
        <div class="loading-spinner"></div>
    </div>

    <!-- Content -->
    <div v-else-if="traderData" class="trading-content">
        <!-- Trader info card -->
        <div class="trading-info-bar">
            <div class="trading-info-item" v-if="traderData.discounts && traderData.discounts.length">
                <span class="trading-info-label">{{ t('app_trading_discounts') }}</span>
                <span v-for="d in traderData.discounts" :key="d[0]" class="trading-discount-badge" :class="d[0]">
                    {{ t('app_trading_discount_' + d[0]) || d[0] }}: {{ (d[1] * 100).toFixed(0) }}%
                </span>
            </div>
            <div class="trading-info-item" v-if="traderData.buy_supplies && traderData.buy_supplies.length">
                <span class="trading-info-label">{{ t('app_trading_supply_tiers') }}</span>
                <span class="trading-tier-count">{{ supplyTierCount }} {{ t('app_trading_levels') }}</span>
            </div>
        </div>

        <!-- Supplies tab -->
        <div v-if="activeTab === 'supplies'" class="trading-supplies">
            <div class="trading-tier-tabs" v-if="supplyKeys.length > 1">
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
            <div v-if="unlockCondition || activeTier === 'supplies_1' || activeTier === 'supplies_generic'" class="trading-unlock-condition">
                <span class="trading-unlock-icon">🔓</span>
                <template v-if="unlockCondition">
                    <template v-for="(label, i) in unlockCondition" :key="i">
                        <span v-if="i > 0" class="trading-unlock-or">{{ t('app_trading_or') || 'OR' }}</span>
                        <span class="trading-unlock-badge">{{ label }}</span>
                    </template>
                </template>
                <span v-else class="trading-unlock-base">{{ t('app_trading_base_tier') }}</span>
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
                            {{ resolveItem(item[0]) ? tName(resolveItem(item[0])) : item[0] }}
                        </div>
                        <div class="trading-item-id" v-if="resolveItem(item[0])">{{ item[0] }}</div>
                        <div class="trading-item-cat" v-if="resolveItem(item[0])">{{ tCat(resolveItem(item[0]).category) }}</div>
                    </div>
                    <div class="trading-item-stats">
                        <span class="trading-item-qty" v-tooltip="t('app_trading_quantity')">×{{ item[1] }}</span>
                        <span class="trading-item-prob" v-if="item[2] != null" v-tooltip="t('app_trading_probability')">
                            <span class="prob-bar" :style="{ width: (item[2] * 100) + '%' }"></span>
                            {{ (item[2] * 100).toFixed(0) }}%
                        </span>
                    </div>
                </a>
            </div>
            <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
        </div>

        <!-- Buy conditions tab -->
        <div v-if="activeTab === 'buy'" class="trading-conditions">
            <div class="trading-conditions-table-wrap">
                <table class="trading-conditions-table" v-if="filteredBuyConditions.length">
                    <thead>
                        <tr>
                            <th>{{ t('app_trading_item') }}</th>
                            <th>{{ t('app_trading_price_multiplier') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in filteredBuyConditions"
                            :key="row[0]"
                            :class="{ 'trading-cond-row--linked': !!buyConditionResolved[row[0]], 'trading-cond-row--unlinked': !buyConditionResolved[row[0]] }"
                            @click="buyConditionResolved[row[0]] && $emit('navigateToItem', buyConditionResolved[row[0]].id)"
                            @mouseenter="buyConditionResolved[row[0]] && $emit('showItemHover', buyConditionResolved[row[0]].id, $event)"
                            @mousemove="$emit('moveItemHover', $event)"
                            @mouseleave="$emit('hideItemHover')"
                        >
                            <td class="trading-cond-item">
                                <span class="trading-cond-name">{{ buyConditionResolved[row[0]] ? tName(buyConditionResolved[row[0]]) : row[0] }}</span>
                                <span class="trading-cond-id" v-if="buyConditionResolved[row[0]]">{{ row[0] }}</span>
                                <span class="trading-cond-cat" v-if="buyConditionResolved[row[0]]">{{ tCat(buyConditionResolved[row[0]].category) }}</span>
                            </td>
                            <td class="trading-cond-value">
                                <span class="trading-mult-bar" :style="{ width: Math.min(row[1] * 100, 100) + '%' }"></span>
                                <span class="trading-mult-label">{{ (row[1] * 100).toFixed(0) }}%</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
            </div>
        </div>

        <!-- Sell conditions tab -->
        <div v-if="activeTab === 'sell'" class="trading-conditions">
            <div class="trading-conditions-table-wrap">
                <table class="trading-conditions-table" v-if="filteredSellConditions.length">
                    <thead>
                        <tr>
                            <th>{{ t('app_trading_item') }}</th>
                            <th>{{ t('app_trading_price_multiplier') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in filteredSellConditions"
                            :key="row[0]"
                            :class="{ 'trading-cond-row--linked': !!sellConditionResolved[row[0]], 'trading-cond-row--unlinked': !sellConditionResolved[row[0]] }"
                            @click="sellConditionResolved[row[0]] && $emit('navigateToItem', sellConditionResolved[row[0]].id)"
                            @mouseenter="sellConditionResolved[row[0]] && $emit('showItemHover', sellConditionResolved[row[0]].id, $event)"
                            @mousemove="$emit('moveItemHover', $event)"
                            @mouseleave="$emit('hideItemHover')"
                        >
                            <td class="trading-cond-item">
                                <span class="trading-cond-name">{{ sellConditionResolved[row[0]] ? tName(sellConditionResolved[row[0]]) : row[0] }}</span>
                                <span class="trading-cond-id" v-if="sellConditionResolved[row[0]]">{{ row[0] }}</span>
                                <span class="trading-cond-cat" v-if="sellConditionResolved[row[0]]">{{ tCat(sellConditionResolved[row[0]].category) }}</span>
                            </td>
                            <td class="trading-cond-value">
                                <span class="trading-mult-bar" :style="{ width: Math.min(row[1] * 100, 100) + '%' }"></span>
                                <span class="trading-mult-label">{{ (row[1] * 100).toFixed(0) }}%</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="trading-empty">{{ t('app_trading_no_results') }}</div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
const TRADER_META = [
    { id: 'stalker_sidorovich',       labelKey: 'app_trader_sidorovich',       label: 'Sidorovich',          color: '#f59e0b' },
    { id: 'stalker_owl',              labelKey: 'app_trader_owl',              label: 'Owl',                 color: '#8b5cf6' },
    { id: 'stalker_loris',            labelKey: 'app_trader_loris',            label: 'Loris',               color: '#6366f1' },
    { id: 'stalker_nimble',           labelKey: 'app_trader_nimble',           label: 'Nimble',              color: '#ec4899' },
    { id: 'stalker_basic',            labelKey: 'app_trader_stalker_basic',    label: 'Stalker',             color: '#a3a3a3' },
    { id: 'stalker_butcher',          labelKey: 'app_trader_butcher',          label: 'Butcher',             color: '#ef4444' },
    { id: 'stalker_flea_market',      labelKey: 'app_trader_flea_market',      label: 'Flea Market',         color: '#f97316' },
    { id: 'stalker_flea_market_night',labelKey: 'app_trader_flea_market_night',label: 'Flea Market (Night)', color: '#c2410c' },
    { id: 'bandit',                   labelKey: 'app_trader_bandit',           label: 'Bandit',              color: '#854d0e' },
    { id: 'bandit_basic',             labelKey: 'app_trader_bandit_basic',     label: 'Bandit (Basic)',      color: '#a16207' },
    { id: 'duty',                     labelKey: 'app_trader_duty',             label: 'Duty',                color: '#dc2626' },
    { id: 'freedom',                  labelKey: 'app_trader_freedom',          label: 'Freedom',             color: '#16a34a' },
    { id: 'csky_spore',               labelKey: 'app_trader_clear_sky',        label: 'Clear Sky',           color: '#0ea5e9' },
    { id: 'ecolog_hermann',           labelKey: 'app_trader_hermann',          label: 'Hermann',             color: '#14b8a6' },
    { id: 'ecolog_sakharov',          labelKey: 'app_trader_sakharov',         label: 'Sakharov',            color: '#06b6d4' },
    { id: 'ecolog_spirit',            labelKey: 'app_trader_spirit',           label: 'Spirit',              color: '#2dd4bf' },
    { id: 'military',                 labelKey: 'app_trader_military',         label: 'Military',            color: '#65a30d' },
    { id: 'military_esc',             labelKey: 'app_trader_military_esc',     label: 'Military (Escape)',   color: '#4d7c0f' },
    { id: 'mercenary',                labelKey: 'app_trader_mercenary',        label: 'Mercenary',           color: '#7c3aed' },
    { id: 'mercenary_basic',          labelKey: 'app_trader_mercenary_basic',  label: 'Mercenary (Basic)',   color: '#6d28d9' },
    { id: 'mercenary_meeker',         labelKey: 'app_trader_meeker',           label: 'Meeker',              color: '#a78bfa' },
    { id: 'monolith',                 labelKey: 'app_trader_monolith',         label: 'Monolith',            color: '#38bdf8' },
    { id: 'monolith_basic',           labelKey: 'app_trader_monolith_basic',   label: 'Monolith (Basic)',    color: '#0284c7' },
    { id: 'greh',                     labelKey: 'app_trader_greh',             label: 'Greh',                color: '#f43f5e' },
    { id: 'isg',                      labelKey: 'app_trader_isg',              label: 'ISG',                 color: '#10b981' },
    { id: 'isg_mission',              labelKey: 'app_trader_isg_mission',      label: 'ISG (Mission)',       color: '#059669' },
    { id: 'generic_barman',           labelKey: 'app_trader_barman',           label: 'Barman',              color: '#d97706' },
    { id: 'generic_mechanic',         labelKey: 'app_trader_mechanic',         label: 'Mechanic',            color: '#78716c' },
    { id: 'generic_medic',            labelKey: 'app_trader_medic',            label: 'Medic',               color: '#e11d48' },
];

export default {
    props: {
        packId: { type: String, default: null },
        indexById: { type: Object, default: () => ({}) },
    },
    inject: ['t', 'tName', 'tCat'],
    emits: ['navigateToItem', 'showItemHover', 'moveItemHover', 'hideItemHover'],
    data() {
        return {
            traders: TRADER_META,
            selectedTrader: 'stalker_sidorovich',
            traderData: null,
            loading: false,
            activeTab: 'supplies',
            activeTier: 'supplies_1',
            searchQuery: '',
            cache: {},
        };
    },
    computed: {
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
        filteredSupplyItems() {
            const q = this.searchQuery.trim().toLowerCase();
            if (!q) return this.currentSupplyItems;
            return this.currentSupplyItems.filter(item => {
                if (item[0].toLowerCase().includes(q)) return true;
                const resolved = this.resolveItem(item[0]);
                if (resolved && this.tName(resolved).toLowerCase().includes(q)) return true;
                return false;
            });
        },
        filteredBuyConditions() {
            const items = this.traderData?.buy_condition || [];
            const q = this.searchQuery.trim().toLowerCase();
            if (!q) return items;
            return items.filter(r => {
                if (r[0].toLowerCase().includes(q)) return true;
                const resolved = this.resolveItem(r[0].replace(/_x$/, ''));
                if (resolved && this.tName(resolved).toLowerCase().includes(q)) return true;
                return false;
            });
        },
        filteredSellConditions() {
            const items = this.traderData?.sell_condition || [];
            const q = this.searchQuery.trim().toLowerCase();
            if (!q) return items;
            return items.filter(r => {
                if (r[0].toLowerCase().includes(q)) return true;
                const resolved = this.resolveItem(r[0].replace(/_x$/, ''));
                if (resolved && this.tName(resolved).toLowerCase().includes(q)) return true;
                return false;
            });
        },
        // Pre-resolve all condition items into maps to avoid repeated lookups in template
        buyConditionResolved() {
            const map = {};
            for (const r of (this.traderData?.buy_condition || [])) {
                const id = r[0].replace(/_x$/, '');
                map[r[0]] = this.resolveItem(id);
            }
            return map;
        },
        sellConditionResolved() {
            const map = {};
            for (const r of (this.traderData?.sell_condition || [])) {
                const id = r[0].replace(/_x$/, '');
                map[r[0]] = this.resolveItem(id);
            }
            return map;
        },
    },
    watch: {
        packId: {
            immediate: true,
            handler() { this.cache = {}; this.loadTrader(); },
        },
        selectedTrader() {
            this.loadTrader();
        },
    },
    methods: {
        resolveItem(id) {
            return this.indexById[id] || null;
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
            const parts = raw.split(/ OR /);
            const labels = [];
            for (const part of parts) {
                const p = part.trim();
                const gw = p.match(/^=actor_goodwill_ge\((\w+):(-?\d+)\)$/);
                if (gw) {
                    const fKey = FACTION_KEY[gw[1]];
                    const fName = fKey ? (this.t(fKey) || FACTION_FALLBACK[gw[1]] || gw[1]) : gw[1];
                    labels.push(`${fName} ≥ ${gw[2]}`);
                    continue;
                }
                if (p === '=heavy_pockets_functor()') {
                    labels.push(this.t('app_trading_cond_heavy_pockets') || 'Heavy Pockets');
                    continue;
                }
                const tk = p.match(/^=toolkit_task_done\((\d+)\)$/);
                if (tk) {
                    labels.push((this.t('app_trading_cond_toolkit_task') || 'Toolkit task {n} done').replace('{n}', tk[1]));
                    continue;
                }
                if (p === '=drugkit_task_done()') {
                    labels.push(this.t('app_trading_cond_drugkit_task') || 'Drug kit task done');
                    continue;
                }
                if (p.startsWith('+')) { labels.push(p.slice(1).replace(/_/g, ' ')); continue; }
                labels.push(p.replace(/^=/, '').replace(/_/g, ' ').replace(/\(.*\)/, '').trim());
            }
            return labels;
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
    padding: 1rem;
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
    font-size: 0.72rem;
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
    background: var(--card); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-size: 0.8rem; outline: none;
}
.trading-search:focus { border-color: var(--accent); }
.trading-search-clear {
    position: absolute; right: 0.3rem; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; line-height: 1;
}

/* Tabs */
.trading-tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 1rem; }
.trading-tab {
    display: flex; align-items: center; gap: 0.35rem;
    padding: 0.55rem 1rem; background: none; border: none;
    border-bottom: 2px solid transparent; margin-bottom: -2px;
    color: var(--text-secondary); font-size: 0.8rem; font-weight: 500; cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.trading-tab:hover { color: var(--text); }
.trading-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* Info bar */
.trading-info-bar {
    display: flex; flex-wrap: wrap; gap: 1rem;
    padding: 0.6rem 0.8rem; background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; margin-bottom: 1rem; font-size: 0.78rem;
}
.trading-info-item { display: flex; align-items: center; gap: 0.5rem; }
.trading-info-label { color: var(--text-secondary); font-weight: 500; }
.trading-discount-badge {
    padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.72rem;
}
.trading-discount-badge.buy { background: rgba(34,197,94,0.15); color: #22c55e; }
.trading-discount-badge.sell { background: rgba(239,68,68,0.15); color: #ef4444; }
.trading-tier-count { color: var(--accent); font-weight: 600; }

/* Tier tabs */
.trading-tier-tabs { display: flex; gap: 0.3rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
.trading-tier-btn {
    padding: 0.3rem 0.7rem; border: 1px solid var(--border); border-radius: 6px;
    background: var(--card); color: var(--text-secondary); font-size: 0.72rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.trading-tier-btn:hover { border-color: var(--text-secondary); color: var(--text); }
.trading-tier-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

/* Unlock condition */
.trading-unlock-condition {
    display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;
    padding: 0.45rem 0.7rem; background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.25); border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.72rem;
}
.trading-unlock-icon { font-size: 0.9rem; flex-shrink: 0; }
.trading-unlock-badge {
    padding: 0.15rem 0.5rem; background: rgba(245,158,11,0.15);
    border: 1px solid rgba(245,158,11,0.35); border-radius: 4px;
    color: #f59e0b; font-weight: 600; white-space: nowrap;
}
.trading-unlock-or { font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.05em; text-transform: uppercase; }
.trading-unlock-base { color: var(--text-secondary); font-style: italic; }

/* Items grid */
.trading-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.5rem;
}
.trading-item-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.7rem;
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
.trading-item-card--linked:hover {
    border-color: var(--accent);
    background: var(--color-overlay-white-6);
}
.trading-item-info { flex: 1; min-width: 0; }
.trading-item-name {
    font-size: 0.75rem; font-weight: 500; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.trading-item-id {
    font-size: 0.62rem; color: var(--text-secondary); opacity: 0.6;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
}
.trading-item-cat {
    font-size: 0.62rem; color: var(--accent); margin-top: 1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.trading-item-stats {
    display: flex; align-items: center; gap: 0.5rem;
    flex-shrink: 0; margin-left: 0.5rem;
}
.trading-item-qty { font-size: 0.72rem; font-weight: 600; color: var(--accent); }
.trading-item-prob {
    position: relative; font-size: 0.65rem; color: var(--text-secondary); min-width: 40px; text-align: right;
}
.prob-bar {
    position: absolute; left: 0; bottom: -2px; height: 2px;
    background: var(--accent); border-radius: 1px; opacity: 0.5;
}

/* Conditions table */
.trading-conditions-table-wrap { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.trading-conditions-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.trading-conditions-table thead { position: sticky; top: 0; z-index: 2; }
.trading-conditions-table th {
    padding: 0.5rem 0.7rem; text-align: left; font-weight: 600;
    color: var(--text-secondary); background: var(--bg); border-bottom: 2px solid var(--border);
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em;
}
.trading-conditions-table td { padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--border); }
.trading-conditions-table tbody tr:hover { background: var(--color-overlay-white-6); }
.trading-cond-row--linked { cursor: pointer; }
.trading-cond-row--linked:hover td:first-child .trading-cond-name { color: var(--accent); }
.trading-cond-row--unlinked .trading-cond-name { color: var(--text-secondary); }
.trading-cond-item { word-break: break-all; }
.trading-cond-name { font-weight: 500; color: var(--text); display: block; }
.trading-cond-id { font-size: 0.62rem; color: var(--text-secondary); opacity: 0.6; display: block; }
.trading-cond-cat {
    display: inline-block;
    margin-top: 2px;
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--accent);
    background: var(--color-accent-tint-12);
    border-radius: 3px;
    padding: 0 0.35rem;
    line-height: 1.6;
}
.trading-cond-value { position: relative; min-width: 120px; }
.trading-mult-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); opacity: 0.1; border-radius: 2px; }
.trading-mult-label { position: relative; font-weight: 600; color: var(--accent); font-size: 0.75rem; }

/* Empty / loading */
.trading-empty { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; }
.trading-loading { display: flex; justify-content: center; padding: 3rem; }

/* Scrollable content area */
.trading-content { flex: 1; min-height: 0; overflow-y: auto; }

/* Responsive */
@media (max-width: 768px) {
    .trading-search-wrap { max-width: 100%; }
    .trading-items-grid { grid-template-columns: 1fr; }
}
</style>

