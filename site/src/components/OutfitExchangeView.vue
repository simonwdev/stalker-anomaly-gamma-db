<template>
    <div v-if="isOutfitExchange && outfitExchange" class="exchange-view">
        <!-- Which way round the player is thinking: "I have this" vs "I want this". -->
        <div class="exchange-controls">
            <div class="view-toggle exchange-dir">
                <button
                    class="exchange-dir-btn"
                    :class="{ active: exchangeDirection === 'give' }"
                    @click="$emit('update:exchangeDirection', 'give')"
                >
                    <LucideArrowRight class="exchange-dir-glyph" :size="12" aria-hidden="true" />
                    <span class="view-toggle-label">{{ t('app_ex_dir_have') }}</span>
                </button>
                <button
                    class="exchange-dir-btn"
                    :class="{ active: exchangeDirection === 'want' }"
                    @click="$emit('update:exchangeDirection', 'want')"
                >
                    <LucideArrowLeft class="exchange-dir-glyph" :size="12" aria-hidden="true" />
                    <span class="view-toggle-label">{{ t('app_ex_dir_want') }}</span>
                </button>
            </div>
            <div class="view-toggle exchange-view-toggle">
                <button
                    :class="{ active: exchangeView === 'cards' }"
                    @click="$emit('update:exchangeView', 'cards')"
                    v-tooltip="t('app_ex_view_cards')"
                    :aria-label="t('app_ex_view_cards')"
                ><LucideLayoutGrid :size="14" /></button>
                <button
                    :class="{ active: exchangeView === 'matrix' }"
                    @click="$emit('update:exchangeView', 'matrix')"
                    v-tooltip="t('app_ex_view_matrix')"
                    :aria-label="t('app_ex_view_matrix')"
                ><LucideTable :size="14" /></button>
            </div>
        </div>

        <div class="exchange-faction-chips">
            <span class="exchange-axis-label">{{ t('app_ex_axis_trade_with') }}</span>
            <button class="exchange-chip" :class="{ active: !exchangeFactionFilter }" @click="$emit('update:exchangeFactionFilter', null)">{{ t('app_label_all') }}</button>
            <button v-for="f in exchangeTraderFactions" :key="f" class="exchange-chip" :class="{ active: exchangeFactionFilter === f }" @click="$emit('update:exchangeFactionFilter', exchangeFactionFilter === f ? null : f)">
                <img v-if="factionIcon(f)" :src="'img/' + factionIcon(f)" :alt="''" class="exchange-chip-icon">
                <span>{{ t(f) }}</span>
            </button>
        </div>

        <div class="exchange-faction-chips">
            <span class="exchange-axis-label">{{ t('app_ex_axis_outfit_faction') }}</span>
            <button class="exchange-chip" :class="{ active: !exchangeSourceFilter }" @click="$emit('update:exchangeSourceFilter', null)">{{ t('app_label_all') }}</button>
            <button v-for="f in exchangeSourceFactions" :key="f" class="exchange-chip" :class="{ active: exchangeSourceFilter === f }" @click="$emit('update:exchangeSourceFilter', exchangeSourceFilter === f ? null : f)">
                <img v-if="factionIcon(f)" :src="'img/' + factionIcon(f)" :alt="''" class="exchange-chip-icon">
                <span>{{ t(f) }}</span>
            </button>
        </div>

        <div v-if="!filteredExchanges.length" class="exchange-empty">{{ t('app_ex_empty') }}</div>

        <div v-else-if="exchangeView === 'cards'" class="tile-grid">
            <div
                v-for="card in filteredExchanges"
                :key="card.key"
                class="tile-card exchange-card"
                :style="{ '--exchange-faction-color': factionColor(card.faction) || 'var(--border-strong)' }"
            >
                <div class="exchange-give">
                    <img v-if="factionIcon(card.faction)" :src="'img/' + factionIcon(card.faction)" alt="" class="exchange-give-emblem">
                    <div class="exchange-kicker">{{ exchangeDirection === 'give' ? t('app_ex_kicker_give') : t('app_ex_kicker_want') }}</div>
                    <div class="exchange-give-name">
                        <a
                            v-if="card.id"
                            href="#"
                            @click.prevent.stop="$emit('navigateToItem', card.id)"
                            @mouseenter="$emit('showItemHover', card.id, $event)"
                            @mouseleave="$emit('hideItemHover')"
                        >{{ t(card.name) }}</a>
                        <span v-else>{{ t(card.name) }}</span>
                    </div>
                    <div class="exchange-give-stats">
                        <span v-if="card.stats && card.stats.exo">{{ t('app_ex_class_exo') }}</span>
                        <span v-if="card.br !== null" v-tooltip="t('app_tooltip_ballistic_rating')">{{ t('app_ex_stat_br') }} {{ card.br }}%</span>
                        <span v-if="card.stats && card.stats.art != null">{{ card.stats.art }} {{ t('app_ex_stat_slots') }}</span>
                        <span v-if="card.stats && card.stats.repair">{{ displayLabel('ui_mm_repair', card.stats.repair) }}</span>
                    </div>
                </div>
                <div class="exchange-results-head">
                    <span>{{ exchangeDirection === 'give' ? t('app_ex_head_receive') : t('app_ex_head_hand_in_any') }}</span>
                    <span class="exchange-results-count">{{ tradeCountLabel(card) }}</span>
                    <span
                        v-if="card.trades.some(tr => tr.delta !== null)"
                        class="exchange-delta-head"
                        v-tooltip="t('app_ex_delta_tooltip')"
                    >{{ t('app_ex_delta_head') }}</span>
                </div>
                <div class="exchange-results">
                    <div v-for="trade in card.trades" :key="trade.faction + trade.name" class="exchange-result-row">
                        <span class="exchange-result-faction">
                            <img v-if="factionIcon(trade.faction)" :src="'img/' + factionIcon(trade.faction)" alt="" class="exchange-result-icon">
                            <span>{{ t(trade.faction) }}</span>
                        </span>
                        <component :is="exchangeDirection === 'give' ? 'LucideArrowRight' : 'LucideArrowLeft'" class="exchange-result-arrow" :size="12" aria-hidden="true" />
                        <span class="exchange-result-name">
                            <a
                                v-if="trade.id"
                                href="#"
                                @click.prevent.stop="$emit('navigateToItem', trade.id)"
                                @mouseenter="$emit('showItemHover', trade.id, $event)"
                                @mouseleave="$emit('hideItemHover')"
                            >{{ t(trade.name) }}</a>
                            <span v-else>{{ t(trade.name) }}</span>
                        </span>
                        <span v-if="trade.delta !== null" class="exchange-delta" :class="deltaClass(trade.delta)">{{ deltaLabel(trade.delta) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="exchange-matrix-wrap">
            <div class="exchange-matrix-scroll">
                <table class="exchange-matrix">
                    <thead>
                        <tr>
                            <th>{{ exchangeDirection === 'give' ? t('app_ex_matrix_hand_in') : t('app_ex_matrix_receive') }}</th>
                            <th v-for="f in exchangeMatrixFactions" :key="f">
                                <img v-if="factionIcon(f)" :src="'img/' + factionIcon(f)" alt="" class="exchange-result-icon">
                                <span>{{ t(f) }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in matrixRows" :key="row.card.key">
                            <th>
                                <a
                                    v-if="row.card.id"
                                    href="#"
                                    @click.prevent.stop="$emit('navigateToItem', row.card.id)"
                                    @mouseenter="$emit('showItemHover', row.card.id, $event)"
                                    @mouseleave="$emit('hideItemHover')"
                                >{{ t(row.card.name) }}</a>
                                <span v-else>{{ t(row.card.name) }}</span>
                            </th>
                            <td v-for="(cell, i) in row.cells" :key="exchangeMatrixFactions[i]" :class="{ 'exchange-matrix-empty': !cell }">
                                <a
                                    v-if="cell && cell.id"
                                    href="#"
                                    @click.prevent.stop="$emit('navigateToItem', cell.id)"
                                    @mouseenter="$emit('showItemHover', cell.id, $event)"
                                    @mouseleave="$emit('hideItemHover')"
                                >{{ t(cell.name) }}</a>
                                <span v-else-if="cell">{{ t(cell.name) }}</span>
                                <span v-else>&mdash;</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="exchange-matrix-legend">{{ t('app_ex_matrix_legend') }}</div>
        </div>
    </div>
</template>

<script>
export default {
    name: "OutfitExchangeView",
    inject: ["t", "tf", "factionIcon", "factionColor", "displayLabel"],
    props: {
        isOutfitExchange: Boolean,
        outfitExchange: [Object, null],
        exchangeFactionFilter: { type: [String, null], default: null },
        exchangeSourceFilter: { type: [String, null], default: null },
        exchangeDirection: { type: String, default: "give" },
        exchangeView: { type: String, default: "cards" },
        exchangeTraderFactions: { type: Array, default: () => [] },
        exchangeSourceFactions: { type: Array, default: () => [] },
        exchangeMatrixFactions: { type: Array, default: () => [] },
        filteredExchanges: { type: Array, default: () => [] },
    },
    emits: [
        "update:exchangeFactionFilter",
        "update:exchangeSourceFilter",
        "update:exchangeDirection",
        "update:exchangeView",
        "navigateToItem",
        "showItemHover",
        "hideItemHover",
    ],
    computed: {
        // One pass per row instead of a scan per cell.
        matrixRows() {
            if (this.exchangeView !== "matrix") return [];
            return this.filteredExchanges.map(card => {
                const byFaction = {};
                for (const trade of card.trades) byFaction[trade.faction] = trade;
                return { card, cells: this.exchangeMatrixFactions.map(f => byFaction[f] || null) };
            });
        },
    },
    methods: {
        tradeCountLabel(card) {
            const n = card.trades.length;
            if (this.exchangeDirection === "give") {
                return n === 1 ? this.t("app_ex_count_trader") : this.tf("app_ex_count_traders", { n });
            }
            return n === 1 ? this.t("app_ex_count_option") : this.tf("app_ex_count_options", { n });
        },
        deltaClass(delta) {
            if (delta > 0) return "exchange-delta-up";
            if (delta < 0) return "exchange-delta-down";
            return "exchange-delta-even";
        },
        // Ballistic Rating change for this swap, in the same points the card
        // header shows.
        deltaLabel(delta) {
            const unit = this.t("app_ex_delta_br");
            if (delta === 0) return `±0 ${unit}`;
            return `${delta > 0 ? "+" : ""}${delta} ${unit}`;
        },
    },
};
</script>
