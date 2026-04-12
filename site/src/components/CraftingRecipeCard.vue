<template>
    <div class="tile-card crafting-recipe-card" @click="$emit('click')">
        <div class="tile-card-header">
            <template v-if="titleClickable">
                <a
                    href="#"
                    @click.prevent.stop="$emit('clickTitle')"
                    class="tile-card-name"
                    @mouseenter="$emit('hoverEnter', $event)"
                    @mousemove="$emit('hoverMove', $event)"
                    @mouseleave="$emit('hoverLeave')"
                >{{ title }}</a>
            </template>
            <template v-else>
                <span class="tile-card-name">{{ title }}</span>
            </template>
            <span v-if="tierLabel" class="craft-tool-tier" :class="tierClass" :title="tierTooltip">{{ tierLabel }}</span>
        </div>
        <div class="crafting-recipe-rows">
            <div
                v-for="(row, idx) in rows"
                :key="row.key || idx"
                class="crafting-recipe-row"
                :style="row.depth ? { paddingLeft: (row.depth * 1.2) + 'rem' } : {}"
            >
                <span
                    v-if="row.expandable"
                    class="tree-toggle"
                    @click.stop="$emit('toggleExpand', row.path)"
                >{{ row.expanded ? '\u25BC' : '\u25B6' }}</span>
                <span v-else-if="row.showBullet" class="tree-leaf-dot">&bull;</span>
                <span v-else-if="row.showPlus" class="recipe-plus">+</span>
                <template v-if="row.href">
                    <a
                        href="#"
                        @click.prevent.stop="$emit('clickRow', row)"
                        @mouseenter="$emit('hoverEnter', $event, row)"
                        @mousemove="$emit('hoverMove', $event)"
                        @mouseleave="$emit('hoverLeave')"
                    >{{ row.label }}</a>
                </template>
                <template v-else>
                    <span :class="{ 'tree-raw': row.raw }">{{ row.label }}</span>
                </template>
                <span class="recipe-ing-amount">{{ row.amount }}</span>
            </div>
        </div>
        <div v-if="footer" class="craft-requires">
            <span class="craft-requires-badge">{{ footer }}</span>
        </div>
    </div>
</template>

<script>
export default {
    name: "CraftingRecipeCard",
    props: {
        title: { type: String, required: true },
        titleClickable: { type: Boolean, default: false },
        tierLabel: { type: String, default: "" },
        tierTooltip: { type: String, default: "" },
        tierClass: { type: String, default: "" },
        rows: { type: Array, required: true },
        footer: { type: String, default: "" },
        footerLabel: { type: String, default: "" },
    },
    emits: ["click", "clickTitle", "clickRow", "toggleExpand", "hoverEnter", "hoverMove", "hoverLeave"],
};
</script>

<style scoped>
.crafting-recipe-card {
    cursor: pointer;
}
.crafting-recipe-card .tile-card-header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.35rem;
    margin-bottom: 0.25rem;
}
.crafting-recipe-rows {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}
.crafting-recipe-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    line-height: 1.6;
}
.crafting-recipe-row a {
    color: var(--accent);
    text-decoration: none;
}
.crafting-recipe-row a:hover {
    text-decoration: underline;
}
.crafting-recipe-row .recipe-ing-amount {
    margin-left: auto;
}
.craft-tool-tier {
    font-family: var(--mono);
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    background: var(--color-accent-tint-8);
    color: var(--accent);
    margin-left: auto;
    flex-shrink: 0;
}
.craft-tool-tier.tier-1 { color: #7ab85c; background: rgba(122, 184, 92, 0.12); }
.craft-tool-tier.tier-2 { color: #5b8abd; background: rgba(91, 138, 189, 0.12); }
.craft-tool-tier.tier-3 { color: #c8a84e; background: rgba(200, 168, 78, 0.12); }
.craft-tool-tier.tier-4 { color: #b85c8a; background: rgba(184, 92, 138, 0.12); }
.craft-tool-tier.tier-5 { color: #b85c5c; background: rgba(184, 92, 92, 0.12); }
.craft-tool-tier.tier-6 { color: #9b6fb0; background: rgba(155, 111, 176, 0.12); }
.craft-requires {
    margin-top: 0.4rem;
}
.craft-requires-badge {
    display: inline-block;
    font-size: 0.6rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--muted);
    border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
