<template>
<div v-if="startingLoadoutsActive && startingLoadoutsData" class="loadout-view">
    <!-- Difficulty tabs -->
    <div class="loadout-difficulty-tabs">
        <button
            v-for="(pts, i) in startingLoadoutsData.points"
            :key="i"
            class="loadout-diff-tab"
            :class="{ active: startingLoadoutsDifficulty === i }"
            @click="$emit('update:startingLoadoutsDifficulty', i)"
        >
            <span class="loadout-diff-label">{{ difficultyLabel(i) }}</span>
            <span class="loadout-diff-pts">{{ pts.toLocaleString() }} {{ t('app_loadout_points') }}</span>
        </button>
    </div>

    <!-- Sticky budget bar -->
    <div class="loadout-budget-bar" :class="budgetState">
        <div class="loadout-budget-left">
            <div class="loadout-budget-track">
                <div class="loadout-budget-fill" :style="{ width: budgetPercent + '%' }"></div>
            </div>
            <div class="loadout-budget-text">
                <span class="loadout-budget-used">{{ selectedCost.toLocaleString() }} / {{ pointBudget.toLocaleString() }} {{ t('app_loadout_points') }}</span>
                <span v-if="remainingPoints >= 0" class="loadout-budget-remaining">{{ remainingPoints.toLocaleString() }} {{ t('app_loadout_remaining') }}</span>
                <span v-else class="loadout-budget-over">{{ Math.abs(remainingPoints).toLocaleString() }} {{ t('app_loadout_over_budget') }}</span>
                <span class="loadout-budget-money">{{ t('app_loadout_starting_money') }}: {{ activeFaction.money.toLocaleString() }} &#8381;</span>
            </div>
        </div>
        <button class="loadout-budget-clear" @click.stop="clearAll()" :title="t('app_loadout_clear')"><LucideTrash2 :size="15" /></button>
    </div>

    <!-- Faction chips -->
    <div class="exchange-faction-chips">
        <button
            v-for="faction in startingLoadoutsData.factions"
            :key="faction.id"
            class="exchange-chip"
            :class="{ active: activeFactionId === faction.id }"
            @click="$emit('update:startingLoadoutsFaction', faction.id)"
        >
            <img
                v-if="factionIcon(faction.id)"
                :src="'/img/' + factionIcon(faction.id)"
                :alt="faction.id"
                class="exchange-chip-icon"
            >
            <span>{{ t(faction.id) }}</span>
        </button>
    </div>

    <!-- Scrollable content -->
    <div class="loadout-scroll">

        <!-- Purchasable items -->
        <div v-if="allSelectableItems.length" class="loadout-section">
            <div class="loadout-section-header static">
                <span>{{ t('app_loadout_purchasable') }}</span>
                <span class="loadout-section-count">{{ allSelectableItems.length }}</span>
                <span class="loadout-section-actions">
                    <a href="#" @click.prevent.stop="selectAll()">{{ t('app_loadout_select_all') }}</a>
                    <a href="#" @click.prevent.stop="clearAll()">{{ t('app_loadout_clear') }}</a>
                </span>
            </div>
            <div class="loadout-item-grid">
                <div
                    v-for="item in allSelectableItems"
                    :key="'p-' + item.id"
                    class="loadout-item"
                    :class="{ selected: getQty(item.id) > 0 }"
                >
                    <!-- Checkbox for qty=1 items -->
                    <label v-if="item.quantity === 1" class="loadout-checkbox" @click.stop>
                        <input type="checkbox" :checked="getQty(item.id) > 0" @change="toggleItem(item.id)">
                        <span class="loadout-checkmark"></span>
                    </label>
                    <!-- Stepper for qty>1 items -->
                    <div v-else class="loadout-stepper" @click.stop>
                        <button class="loadout-stepper-btn" :disabled="getQty(item.id) <= 0" @click="stepQty(item.id, -1, item.quantity)">&#8722;</button>
                        <span class="loadout-stepper-val">{{ getQty(item.id) }}/{{ item.quantity }}</span>
                        <button class="loadout-stepper-btn" :disabled="getQty(item.id) >= item.quantity" @click="stepQty(item.id, 1, item.quantity)">+</button>
                    </div>
                    <span
                        class="loadout-item-name"
                        :class="{ clickable: indexById[item.id] }"
                        @click="indexById[item.id] && $emit('navigateToItem', item.id)"
                        @mouseenter="indexById[item.id] && $emit('showItemHover', item.id, $event)"
                        @mousemove="indexById[item.id] && $emit('moveItemHover', $event)"
                        @mouseleave="$emit('hideItemHover')"
                    >{{ itemName(item.id) }}</span>
                    <span v-if="item.isFactionOnly" class="loadout-faction-tag" :title="t(activeFactionId)">
                        <img v-if="factionIcon(activeFactionId)" :src="'/img/' + factionIcon(activeFactionId)" class="loadout-faction-tag-icon">
                    </span>
                    <span v-if="item.difficultyLock === 1" class="loadout-lock" :title="t('app_loadout_stalker_veteran_only')">TS</span>
                    <span v-else-if="item.difficultyLock === 2" class="loadout-lock lock-hard" :title="t('app_loadout_stalker_only')">T</span>
                    <span class="loadout-cost">{{ item.cost }} {{ t('app_loadout_points') }}</span>
                </div>
            </div>
        </div>

        <!-- Included ammo -->
        <div v-if="ammoEntries.length" class="loadout-section">
            <div class="loadout-section-header static">
                <span>{{ t('app_loadout_included_ammo') }}</span>
                <span class="loadout-section-count">{{ ammoEntries.length }}</span>
            </div>
            <div class="loadout-item-grid">
                <div
                    v-for="entry in ammoEntries"
                    :key="'a-' + entry.weaponId"
                    class="loadout-item loadout-ammo-row"
                >
                    <span
                        class="loadout-item-name"
                        :class="{ clickable: indexById[entry.weaponId] }"
                        @click.stop="indexById[entry.weaponId] && $emit('navigateToItem', entry.weaponId)"
                        @mouseenter="indexById[entry.weaponId] && $emit('showItemHover', entry.weaponId, $event)"
                        @mousemove="indexById[entry.weaponId] && $emit('moveItemHover', $event)"
                        @mouseleave="$emit('hideItemHover')"
                    >{{ itemName(entry.weaponId) }}</span>
                    <svg class="loadout-ammo-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span
                        class="loadout-ammo-name"
                        :class="{ clickable: indexById[entry.ammoId] }"
                        @click.stop="indexById[entry.ammoId] && $emit('navigateToItem', entry.ammoId)"
                        @mouseenter="indexById[entry.ammoId] && $emit('showItemHover', entry.ammoId, $event)"
                        @mousemove="indexById[entry.ammoId] && $emit('moveItemHover', $event)"
                        @mouseleave="$emit('hideItemHover')"
                    >{{ itemName(entry.ammoId) }}</span>
                    <span class="loadout-qty">&times;{{ entry.quantity }}</span>
                </div>
            </div>
        </div>

        <!-- Free items -->
        <div v-if="allFreeItems.length" class="loadout-section">
            <div class="loadout-section-header static">
                <span>{{ t('app_loadout_free_items') }}</span>
                <span class="loadout-section-count">{{ allFreeItems.length }}</span>
            </div>
            <div class="loadout-item-grid">
                <div
                    v-for="item in allFreeItems"
                    :key="'f-' + item.id"
                    class="loadout-item"
                >
                    <span
                        class="loadout-item-name"
                        :class="{ clickable: indexById[item.id] }"
                        @click="indexById[item.id] && $emit('navigateToItem', item.id)"
                        @mouseenter="indexById[item.id] && $emit('showItemHover', item.id, $event)"
                        @mousemove="indexById[item.id] && $emit('moveItemHover', $event)"
                        @mouseleave="$emit('hideItemHover')"
                    >{{ itemName(item.id) }}</span>
                    <span v-if="item.quantity > 1" class="loadout-qty">&times;{{ item.quantity }}</span>
                    <span v-if="item.isFactionOnly" class="loadout-faction-tag" :title="t(activeFactionId)">
                        <img v-if="factionIcon(activeFactionId)" :src="'/img/' + factionIcon(activeFactionId)" class="loadout-faction-tag-icon">
                    </span>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
export default {
    name: "StartingLoadoutsView",
    inject: ["t", "factionIcon"],
    props: {
        startingLoadoutsActive: Boolean,
        startingLoadoutsData: { type: Object, default: null },
        startingLoadoutsFaction: { type: String, default: null },
        startingLoadoutsDifficulty: { type: Number, default: 0 },
        packId: { type: String, default: "" },
        indexById: { type: Object, default: () => ({}) },
    },
    emits: ["update:startingLoadoutsFaction", "update:startingLoadoutsDifficulty", "navigateToItem", "showItemHover", "moveItemHover", "hideItemHover"],
    data() {
        return {
            // { [factionId]: { [itemId]: selectedQty } }
            selectedItems: {},
        };
    },
    computed: {
        activeFactionId() {
            if (this.startingLoadoutsFaction) return this.startingLoadoutsFaction;
            return this.startingLoadoutsData?.factions?.[0]?.id || null;
        },
        activeFaction() {
            if (!this.startingLoadoutsData) return null;
            return this.startingLoadoutsData.factions.find(f => f.id === this.activeFactionId)
                || this.startingLoadoutsData.factions[0];
        },
        currentSelections() {
            return this.selectedItems[this.activeFactionId] || {};
        },
        sharedIds() {
            if (!this.startingLoadoutsData) return new Set();
            return new Set(this.startingLoadoutsData.shared.map(i => i.id));
        },
        allVisibleItems() {
            if (!this.startingLoadoutsData || !this.activeFaction) return [];
            const shared = this.filterByDifficulty(this.startingLoadoutsData.shared);
            const factionOnly = this.filterByDifficulty(
                this.activeFaction.items.filter(i => !this.sharedIds.has(i.id))
            );
            return [
                ...shared.map(i => ({ ...i, isFactionOnly: false })),
                ...factionOnly.map(i => ({ ...i, isFactionOnly: true })),
            ];
        },
        allFreeItems() {
            return this.allVisibleItems.filter(i => !i.selectable).sort((a, b) => this.itemName(a.id).localeCompare(this.itemName(b.id)));
        },
        allSelectableItems() {
            return this.allVisibleItems.filter(i => i.selectable).sort((a, b) => this.itemName(a.id).localeCompare(this.itemName(b.id)));
        },
        selectedCost() {
            const sel = this.currentSelections;
            let cost = 0;
            for (const item of this.allSelectableItems) {
                const qty = sel[item.id] || 0;
                if (qty > 0) cost += item.cost * qty;
            }
            return cost;
        },
        pointBudget() {
            return this.startingLoadoutsData?.points?.[this.startingLoadoutsDifficulty] || 0;
        },
        remainingPoints() {
            return this.pointBudget - this.selectedCost;
        },
        budgetPercent() {
            if (!this.pointBudget) return 0;
            return Math.min((this.selectedCost / this.pointBudget) * 100, 100);
        },
        budgetState() {
            const pct = this.selectedCost / this.pointBudget;
            if (pct >= 1) return "over";
            if (pct >= 0.6) return "warn";
            return "ok";
        },
        ammoEntries() {
            if (!this.startingLoadoutsData || !this.activeFaction) return [];
            const { ammoPerWeapon, ammoCount } = this.startingLoadoutsData;
            if (!ammoPerWeapon || !ammoCount) return [];
            const sel = this.currentSelections;
            const entries = [];
            const seen = new Set();
            for (const item of this.allVisibleItems) {
                if (item.selectable && !(sel[item.id] > 0)) continue;
                const ammoId = ammoPerWeapon[item.id];
                if (ammoId && !seen.has(item.id)) {
                    seen.add(item.id);
                    entries.push({
                        weaponId: item.id,
                        ammoId,
                        quantity: ammoCount[ammoId] || 0,
                    });
                }
            }
            return entries;
        },
    },
    watch: {
        activeFactionId: {
            immediate: true,
            handler(id) {
                if (id && !(id in this.selectedItems)) {
                    this.loadSelections(id);
                }
            },
        },
    },
    methods: {
        difficultyLabel(index) {
            const keys = ["app_loadout_difficulty_stalker", "app_loadout_difficulty_veteran", "app_loadout_difficulty_master"];
            return this.t(keys[index]) || ["Stalker", "Veteran", "Master"][index];
        },
        itemName(id) {
            const entry = this.indexById[id];
            if (entry?.name) return this.t(entry.name);
            if (entry?.displayName) return this.t(entry.displayName);
            const translated = this.t(id);
            if (translated && translated !== id) return translated;
            return id;
        },
        filterByDifficulty(items) {
            const d = this.startingLoadoutsDifficulty;
            return items.filter(item =>
                item.difficultyLock === null || d <= (2 - item.difficultyLock)
            );
        },
        getQty(id) {
            return this.currentSelections[id] || 0;
        },
        setQty(id, qty) {
            const fid = this.activeFactionId;
            const sel = { ...(this.selectedItems[fid] || {}) };
            if (qty <= 0) delete sel[id];
            else sel[id] = qty;
            this.selectedItems = { ...this.selectedItems, [fid]: sel };
            this.saveSelections(fid);
        },
        toggleItem(id) {
            this.setQty(id, this.getQty(id) > 0 ? 0 : 1);
        },
        stepQty(id, delta, max) {
            const current = this.getQty(id);
            const next = Math.max(0, Math.min(max, current + delta));
            this.setQty(id, next);
        },
        selectAll() {
            const fid = this.activeFactionId;
            const sel = { ...(this.selectedItems[fid] || {}) };
            for (const item of this.allSelectableItems) sel[item.id] = item.quantity;
            this.selectedItems = { ...this.selectedItems, [fid]: sel };
            this.saveSelections(fid);
        },
        clearAll() {
            const fid = this.activeFactionId;
            this.selectedItems = { ...this.selectedItems, [fid]: {} };
            this.saveSelections(fid);
        },
        storageKey(fid) {
            return `loadoutSelections:${this.packId || "default"}:${fid}`;
        },
        saveSelections(fid) {
            try {
                const sel = this.selectedItems[fid];
                if (!sel || !Object.keys(sel).length) {
                    localStorage.removeItem(this.storageKey(fid));
                } else {
                    localStorage.setItem(this.storageKey(fid), JSON.stringify(sel));
                }
            } catch { /* quota or private mode */ }
        },
        loadSelections(fid) {
            try {
                const raw = localStorage.getItem(this.storageKey(fid));
                if (raw) {
                    this.selectedItems = { ...this.selectedItems, [fid]: JSON.parse(raw) };
                } else {
                    this.selectedItems = { ...this.selectedItems, [fid]: {} };
                }
            } catch {
                this.selectedItems = { ...this.selectedItems, [fid]: {} };
            }
        },
    },
};
</script>

<style scoped>
.loadout-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding-right: calc(1rem + 8px);
    gap: 0.5rem;
}

/* Difficulty tabs */
.loadout-difficulty-tabs {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
}

.loadout-diff-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-secondary);
    font-size: 0.7rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.loadout-diff-tab:hover {
    color: var(--text);
    border-color: var(--accent-dim);
}

.loadout-diff-tab.active {
    color: var(--accent);
    border-color: var(--accent-dim);
    background: var(--color-accent-tint-8);
}

.loadout-diff-label {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.loadout-diff-pts {
    font-family: var(--mono);
    opacity: 0.7;
    font-size: 0.65rem;
}

.loadout-diff-tab.active .loadout-diff-pts {
    opacity: 1;
}

/* Budget bar */
.loadout-budget-bar {
    display: flex;
    align-items: stretch;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 5px;
    flex-shrink: 0;
    transition: border-color 0.2s;
}

.loadout-budget-left {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.loadout-budget-bar.warn {
    border-color: var(--color-accent-orange);
}

.loadout-budget-bar.over {
    border-color: var(--color-red);
}

.loadout-budget-track {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
}

.loadout-budget-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.2s, background 0.2s;
    background: var(--color-green);
}

.loadout-budget-bar.warn .loadout-budget-fill {
    background: var(--color-accent-orange);
}

.loadout-budget-bar.over .loadout-budget-fill {
    background: var(--color-red);
}

.loadout-budget-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    flex-wrap: wrap;
}

.loadout-budget-used {
    font-family: var(--mono);
    font-weight: 600;
    color: var(--text);
}

.loadout-budget-remaining {
    font-family: var(--mono);
    color: var(--color-green-positive);
}

.loadout-budget-over {
    font-family: var(--mono);
    color: var(--color-red);
    font-weight: 600;
}

.loadout-budget-money {
    margin-left: auto;
    font-family: var(--mono);
    color: var(--color-accent-light);
}

.loadout-budget-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-left: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0 0.6rem;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
    border-radius: 0 4px 4px 0;
}

.loadout-budget-clear:hover {
    color: var(--color-red);
    background: var(--color-red-tint-15);
}

/* Scrollable area */
.loadout-scroll {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding-bottom: 1rem;
}

/* Sections */
.loadout-section {
    display: flex;
    flex-direction: column;
}

.loadout-section-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    color: var(--accent);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--accent-dim);
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    cursor: default;
    text-align: left;
}

.loadout-section-count {
    font-size: 0.6rem;
    font-weight: 400;
    color: var(--text-secondary);
    background: var(--border);
    padding: 0 0.35rem;
    border-radius: 3px;
    font-family: var(--mono);
}

.loadout-section-actions {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
    font-size: 0.6rem;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
}

.loadout-section-actions a {
    color: var(--accent-dim);
    text-decoration: none;
}

.loadout-section-actions a:hover {
    color: var(--accent);
    text-decoration: underline;
}

/* Item grid */
.loadout-item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.25rem;
    padding: 0.35rem 0;
}

/* Item row */
.loadout-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.7rem;
    transition: background 0.1s;
}

.loadout-item:hover {
    background: var(--color-accent-tint-5);
}

.loadout-item.selected {
    background: var(--color-accent-tint-8);
}

.loadout-item.selected:hover {
    background: var(--color-accent-tint-10);
}

/* Checkbox (qty=1 items) */
.loadout-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    width: 14px;
    height: 14px;
}

.loadout-checkbox input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.loadout-checkmark {
    width: 14px;
    height: 14px;
    border: 1px solid var(--color-accent-tint-35);
    border-radius: 2px;
    background: transparent;
    transition: background 0.1s, border-color 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loadout-checkbox input:checked + .loadout-checkmark {
    background: var(--color-accent-tint-15);
    border-color: var(--accent-dim);
}

.loadout-checkbox input:checked + .loadout-checkmark::after {
    content: "";
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 1px;
}

.loadout-checkbox:hover .loadout-checkmark {
    border-color: var(--accent-dim);
}

/* Stepper (qty>1 items) */
.loadout-stepper {
    display: flex;
    align-items: center;
    gap: 0;
    flex-shrink: 0;
    border: 1px solid var(--color-accent-tint-35);
    border-radius: 3px;
    overflow: hidden;
    height: 18px;
}

.loadout-stepper-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 100%;
    background: transparent;
    border: none;
    color: var(--accent-dim);
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: background 0.1s, color 0.1s;
    line-height: 1;
}

.loadout-stepper-btn:hover:not(:disabled) {
    background: var(--color-accent-tint-12);
    color: var(--accent);
}

.loadout-stepper-btn:disabled {
    opacity: 0.25;
    cursor: default;
}

.loadout-item.selected .loadout-stepper {
    border-color: var(--accent-dim);
}

.loadout-stepper-val {
    font-family: var(--mono);
    font-size: 0.55rem;
    color: var(--text-secondary);
    padding: 0 0.2rem;
    min-width: 22px;
    text-align: center;
    background: var(--color-accent-tint-5);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loadout-item-name {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.loadout-item-name.clickable {
    color: var(--accent);
    cursor: pointer;
}

.loadout-item-name.clickable:hover {
    text-decoration: underline;
}

.loadout-qty {
    font-family: var(--mono);
    font-size: 0.6rem;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.loadout-cost {
    font-family: var(--mono);
    font-size: 0.6rem;
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: color 0.15s;
}

.loadout-item.selected .loadout-cost {
    color: var(--color-accent-orange);
}

/* Faction-specific indicator */
.loadout-faction-tag {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    background: var(--color-overlay-white-10);
    border-radius: 3px;
    padding: 2px;
}

.loadout-faction-tag-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
}

.loadout-lock {
    font-family: var(--mono);
    font-size: 0.55rem;
    font-weight: 600;
    color: var(--color-blue-soft);
    background: var(--color-blue-tint-15);
    padding: 0 0.25rem;
    border-radius: 2px;
    flex-shrink: 0;
    letter-spacing: 0.02em;
}

.loadout-lock.lock-hard {
    color: var(--color-red-warm-soft);
    background: var(--color-red-tint-15);
}

/* Ammo rows */
.loadout-ammo-row {
    grid-column: 1 / -1;
}

.loadout-ammo-arrow {
    flex-shrink: 0;
    color: var(--text-secondary);
    opacity: 0.5;
}

.loadout-ammo-name {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.loadout-ammo-name.clickable {
    color: var(--accent);
    cursor: pointer;
}

.loadout-ammo-name.clickable:hover {
    text-decoration: underline;
}

.loadout-ammo-row .loadout-item-name {
    flex: 0 1 auto;
    max-width: 40%;
}

.loadout-ammo-row .loadout-ammo-name {
    flex: 1;
}

/* Responsive */
@media (max-width: 640px) {
    .loadout-view {
        padding-right: 0.5rem;
    }

    .loadout-difficulty-tabs {
        flex-direction: column;
    }

    .loadout-item-grid {
        grid-template-columns: 1fr;
    }
}
</style>
