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
                {{ trader.label }}
            </button>
        </div>
        <div class="trading-search-wrap">
            <input
                type="text"
                class="trading-search"
                v-model="searchQuery"
                :placeholder="t('app_trading_search') || 'Search items...'"
            >
            <button v-if="searchQuery" class="trading-search-clear" @click="searchQuery = ''">&times;</button>
        </div>
    </div>

    <!-- Tab bar -->
    <div class="trading-tabs">
        <button class="trading-tab" :class="{ active: activeTab === 'supplies' }" @click="activeTab = 'supplies'">
            <LucidePackage :size="14" />
            {{ t('app_trading_supplies') || 'Supplies' }}
        </button>
        <button class="trading-tab" :class="{ active: activeTab === 'buy' }" @click="activeTab = 'buy'">
            <LucideArrowDownCircle :size="14" />
            {{ t('app_trading_buy_conditions') || 'Buy Conditions' }}
        </button>
        <button class="trading-tab" :class="{ active: activeTab === 'sell' }" @click="activeTab = 'sell'">
            <LucideArrowUpCircle :size="14" />
            {{ t('app_trading_sell_conditions') || 'Sell Conditions' }}
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
                <span class="trading-info-label">{{ t('app_trading_discounts') || 'Discounts' }}</span>
                <span v-for="d in traderData.discounts" :key="d[0]" class="trading-discount-badge" :class="d[0]">
                    {{ d[0] }}: {{ (d[1] * 100).toFixed(0) }}%
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
                        <span v-if="i > 0" class="trading-unlock-or">OR</span>
                        <span class="trading-unlock-badge">{{ label }}</span>
                    </template>
                </template>
                <span v-else class="trading-unlock-base">{{ t('app_trading_base_tier') || 'Base tier' }}</span>
            </div>
            <div class="trading-items-grid" v-if="filteredSupplyItems.length">
                <div v-for="item in filteredSupplyItems" :key="item[0]" class="trading-item-card">
                    <div class="trading-item-name">{{ item[0] }}</div>
                    <div class="trading-item-stats">
                        <span class="trading-item-qty" v-tooltip="t('app_trading_quantity')">×{{ item[1] }}</span>
                        <span class="trading-item-prob" v-if="item[2] != null" v-tooltip="t('app_trading_probability')">
                            <span class="prob-bar" :style="{ width: (item[2] * 100) + '%' }"></span>
                            {{ (item[2] * 100).toFixed(0) }}%
                        </span>
                    </div>
                </div>
            </div>
            <div v-else class="trading-empty">{{ t('app_trading_no_results') || 'No matching items found.' }}</div>
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
                        <tr v-for="row in filteredBuyConditions" :key="row[0]">
                            <td class="trading-cond-item">{{ row[0] }}</td>
                            <td class="trading-cond-value">
                                <span class="trading-mult-bar" :style="{ width: Math.min(row[1] * 100, 100) + '%' }"></span>
                                <span class="trading-mult-label">{{ row[1] }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="trading-empty">{{ t('app_trading_no_results') || 'No matching items found.' }}</div>
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
                        <tr v-for="row in filteredSellConditions" :key="row[0]">
                            <td class="trading-cond-item">{{ row[0] }}</td>
                            <td class="trading-cond-value">
                                <span class="trading-mult-bar" :style="{ width: Math.min(row[1] * 100, 100) + '%' }"></span>
                                <span class="trading-mult-label">{{ row[1] }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="trading-empty">{{ t('app_trading_no_results') || 'No matching items found.' }}</div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
const TRADER_META = [
    { id: 'stalker_sidorovich', label: 'Sidorovich', color: '#f59e0b' },
    { id: 'stalker_owl', label: 'Owl', color: '#8b5cf6' },
    { id: 'stalker_loris', label: 'Loris', color: '#6366f1' },
    { id: 'stalker_nimble', label: 'Nimble', color: '#ec4899' },
    { id: 'stalker_basic', label: 'Stalker', color: '#a3a3a3' },
    { id: 'stalker_butcher', label: 'Butcher', color: '#ef4444' },
    { id: 'stalker_flea_market', label: 'Flea Market', color: '#f97316' },
    { id: 'stalker_flea_market_night', label: 'Flea Market (Night)', color: '#c2410c' },
    { id: 'bandit', label: 'Bandit', color: '#854d0e' },
    { id: 'bandit_basic', label: 'Bandit (Basic)', color: '#a16207' },
    { id: 'duty', label: 'Duty', color: '#dc2626' },
    { id: 'freedom', label: 'Freedom', color: '#16a34a' },
    { id: 'csky_spore', label: 'Clear Sky', color: '#0ea5e9' },
    { id: 'ecolog_hermann', label: 'Hermann', color: '#14b8a6' },
    { id: 'ecolog_sakharov', label: 'Sakharov', color: '#06b6d4' },
    { id: 'ecolog_spirit', label: 'Spirit', color: '#2dd4bf' },
    { id: 'military', label: 'Military', color: '#65a30d' },
    { id: 'military_esc', label: 'Military (Escape)', color: '#4d7c0f' },
    { id: 'mercenary', label: 'Mercenary', color: '#7c3aed' },
    { id: 'mercenary_basic', label: 'Mercenary (Basic)', color: '#6d28d9' },
    { id: 'mercenary_meeker', label: 'Meeker', color: '#a78bfa' },
    { id: 'monolith', label: 'Monolith', color: '#38bdf8' },
    { id: 'monolith_basic', label: 'Monolith (Basic)', color: '#0284c7' },
    { id: 'greh', label: 'Greh', color: '#f43f5e' },
    { id: 'isg', label: 'ISG', color: '#10b981' },
    { id: 'isg_mission', label: 'ISG (Mission)', color: '#059669' },
    { id: 'generic_barman', label: 'Barman', color: '#d97706' },
    { id: 'generic_mechanic', label: 'Mechanic', color: '#78716c' },
    { id: 'generic_medic', label: 'Medic', color: '#e11d48' },
];

export default {
    props: {
        packId: { type: String, default: null },
    },
    inject: ['t'],
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
            if (!this.searchQuery.trim()) return this.currentSupplyItems;
            const q = this.searchQuery.toLowerCase();
            return this.currentSupplyItems.filter(item => item[0].toLowerCase().includes(q));
        },
        filteredBuyConditions() {
            const items = this.traderData?.buy_condition || [];
            if (!this.searchQuery.trim()) return items;
            const q = this.searchQuery.toLowerCase();
            return items.filter(r => r[0].toLowerCase().includes(q));
        },
        filteredSellConditions() {
            const items = this.traderData?.sell_condition || [];
            if (!this.searchQuery.trim()) return items;
            const q = this.searchQuery.toLowerCase();
            return items.filter(r => r[0].toLowerCase().includes(q));
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
        selectTrader(id) {
            this.selectedTrader = id;
            this.activeTier = 'supplies_1';
        },
        parseCondition(raw) {
            const FACTION = {
                stalker: 'Stalker', bandit: 'Bandit', csky: 'Clear Sky',
                dolg: 'Duty', freedom: 'Freedom', ecolog: 'Ecologist',
                army: 'Military', monolith: 'Monolith', killer: 'Mercenary',
                greh: 'Greh', isg: 'ISG',
            };
            const parts = raw.split(/ OR /);
            const labels = [];
            for (const part of parts) {
                const p = part.trim();
                // =actor_goodwill_ge(faction:value)
                const gw = p.match(/^=actor_goodwill_ge\((\w+):(-?\d+)\)$/);
                if (gw) {
                    const faction = FACTION[gw[1]] || gw[1];
                    labels.push(`${faction} ≥ ${gw[2]}`);
                    continue;
                }
                // =heavy_pockets_functor()
                if (p === '=heavy_pockets_functor()') {
                    labels.push('Heavy Pockets');
                    continue;
                }
                // =toolkit_task_done(n)
                const tk = p.match(/^=toolkit_task_done\((\d+)\)$/);
                if (tk) { labels.push(`Toolkit task ${tk[1]} done`); continue; }
                // =drugkit_task_done()
                if (p === '=drugkit_task_done()') { labels.push('Drug kit task done'); continue; }
                // +story_flag style
                if (p.startsWith('+')) {
                    labels.push(p.slice(1).replace(/_/g, ' '));
                    continue;
                }
                // fallback — strip = and tidy
                labels.push(p.replace(/^=/, '').replace(/_/g, ' ').replace(/\(.*\)/, '').trim());
            }
            return labels;
        },
        tierLabel(key) {
            if (key === 'supplies_generic') return 'Generic';
            const num = key.replace('supplies_', '');
            return `${this.t('app_trading_level') || 'Level'} ${num}`;
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
                const url = `/data/${this.packId}/traders/${id}.json`;
                const resp = await fetch(url);
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
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
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
.trading-pill:hover {
    color: var(--text);
    border-color: var(--text-secondary);
}
.trading-pill.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
}
.trading-pill-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.trading-pill.active .trading-pill-dot {
    box-shadow: 0 0 0 2px rgba(255,255,255,0.4);
}

/* Search */
.trading-search-wrap {
    position: relative;
    margin-left: auto;
    min-width: 200px;
}
.trading-search {
    width: 100%;
    padding: 0.4rem 2rem 0.4rem 0.6rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 0.8rem;
    outline: none;
}
.trading-search:focus { border-color: var(--accent); }
.trading-search-clear {
    position: absolute;
    right: 0.3rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
}

/* Tabs */
.trading-tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--border);
    margin-bottom: 1rem;
}
.trading-tab {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.trading-tab:hover { color: var(--text); }
.trading-tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
}

/* Info bar */
.trading-info-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.6rem 0.8rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.78rem;
}
.trading-info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.trading-info-label {
    color: var(--text-secondary);
    font-weight: 500;
}
.trading-discount-badge {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.72rem;
}
.trading-discount-badge.buy {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}
.trading-discount-badge.sell {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}
.trading-tier-count {
    color: var(--accent);
    font-weight: 600;
}

/* Tier tabs */
.trading-tier-tabs {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
}
.trading-tier-btn {
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--card);
    color: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}
.trading-tier-btn:hover {
    border-color: var(--text-secondary);
    color: var(--text);
}
.trading-tier-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
}

/* Unlock condition */
.trading-unlock-condition {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.45rem 0.7rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    font-size: 0.72rem;
}
.trading-unlock-icon { font-size: 0.9rem; flex-shrink: 0; }
.trading-unlock-badge {
    padding: 0.15rem 0.5rem;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-radius: 4px;
    color: #f59e0b;
    font-weight: 600;
    white-space: nowrap;
}
.trading-unlock-or {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
}
.trading-unlock-base {
    color: var(--text-secondary);
    font-style: italic;
}

/* Items grid */
.trading-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
    transition: border-color 0.15s;
}
.trading-item-card:hover {
    border-color: var(--accent);
}
.trading-item-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text);
    word-break: break-all;
    min-width: 0;
    flex: 1;
}
.trading-item-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: 0.5rem;
}
.trading-item-qty {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--accent);
}
.trading-item-prob {
    position: relative;
    font-size: 0.65rem;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: right;
}
.prob-bar {
    position: absolute;
    left: 0;
    bottom: -2px;
    height: 2px;
    background: var(--accent);
    border-radius: 1px;
    opacity: 0.5;
}

/* Conditions table */
.trading-conditions-table-wrap {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}
.trading-conditions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
}
.trading-conditions-table thead {
    position: sticky;
    top: 0;
    z-index: 2;
}
.trading-conditions-table th {
    padding: 0.5rem 0.7rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg);
    border-bottom: 2px solid var(--border);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.trading-conditions-table td {
    padding: 0.4rem 0.7rem;
    border-bottom: 1px solid var(--border);
}
.trading-conditions-table tbody tr:hover {
    background: var(--color-overlay-white-6);
}
.trading-cond-item {
    font-weight: 500;
    color: var(--text);
    word-break: break-all;
}
.trading-cond-value {
    position: relative;
    min-width: 120px;
}
.trading-mult-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--accent);
    opacity: 0.1;
    border-radius: 2px;
}
.trading-mult-label {
    position: relative;
    font-weight: 600;
    color: var(--accent);
    font-size: 0.75rem;
}

/* Empty state */
.trading-empty {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
}

/* Loading */
.trading-loading {
    display: flex;
    justify-content: center;
    padding: 3rem;
}

/* Scrollable content area */
.trading-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

/* Responsive */
@media (max-width: 768px) {
    .trading-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    .trading-search-wrap {
        margin-left: 0;
        min-width: 0;
    }
    .trading-items-grid {
        grid-template-columns: 1fr;
    }
}
</style>

