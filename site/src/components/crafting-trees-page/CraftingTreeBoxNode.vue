<template>
    <div class="ctree-node-layout">
        <!-- Node box -->
        <div
            class="ctree-node"
            :class="[
                isRoot ? 'ctree-node--root' : 'ctree-node--child',
                { 'ctree-node--expandable': !isRoot && hasOwnChildren },
                { 'ctree-node--sub-expanded': !isRoot && hasOwnChildren && expanded },
                { 'ctree-node--clickable': !isRoot && !hasOwnChildren && !!nodeItem },
            ]"
            @click.stop="handleNodeClick"
        >
            <img
                v-if="nodeItem && nodeItem.id"
                class="ctree-node-icon"
                :src="`img/icons/${nodeItem.id}.png`"
                alt=""
                @error="$event.target.style.display = 'none'"
            />
            <div class="ctree-node-name">
                <a v-if="nodeItem" href="#" @click.prevent.stop="$emit('navigate', nodeItem.id)">{{ label }}</a>
                <span v-else class="ctree-node-raw">{{ label }}</span>
            </div>
            <div v-if="amount" class="ctree-node-amount">{{ amount }}</div>
            <!-- Expand toggle for craftable sub-ingredients -->
            <div v-if="!isRoot && hasOwnChildren" class="ctree-expand-toggle" @click.stop="toggleExpand">
                <span class="ctree-expand-arrow" :class="{ 'ctree-expand-arrow--open': expanded }">▶</span>
                <span class="ctree-expand-count">{{ children.length }} {{ t('app_label_sub_ingredients') }}</span>
            </div>
            <span v-if="isRoot && tier" class="ctree-node-tier" :class="'ctree-tier-' + tier">
                {{ t('app_craft_toolkit_' + tier) }}
            </span>
            <div v-if="isRoot && recipeReq" class="ctree-node-req">{{ t(recipeReq) }}</div>
        </div>

        <!-- Children column: always shown for root, shown when expanded for non-root -->
        <div class="ctree-right" v-if="showChildren">
            <div class="ctree-rows">
                <div v-for="(child, idx) in children" :key="idx" class="ctree-row">
                    <CraftingTreeBoxNode
                        :name="child.name"
                        :amount="child.amount || ''"
                        :children="child.children || []"
                        :is-root="false"
                        @navigate="$emit('navigate', $event)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'CraftingTreeBoxNode',
    inject: ['t', 'findItemByName'],
    props: {
        name: { type: String, required: true },
        amount: { type: String, default: '' },
        children: { type: Array, default: () => [] },
        isRoot: { type: Boolean, default: false },
        tier: { type: [Number, String], default: null },
        recipeReq: { type: String, default: '' },
    },
    emits: ['navigate'],
    data() {
        return { expanded: false };
    },
    computed: {
        nodeItem() {
            return this.findItemByName(this.name) || null;
        },
        label() {
            return this.t(this.name);
        },
        hasOwnChildren() {
            return this.children && this.children.length > 0;
        },
        showChildren() {
            return this.hasOwnChildren && (this.isRoot || this.expanded);
        },
    },
    methods: {
        handleNodeClick() {
            if (this.isRoot) return;
            if (this.hasOwnChildren) {
                this.toggleExpand();
            } else if (this.nodeItem) {
                this.$emit('navigate', this.nodeItem.id);
            }
        },
        toggleExpand() {
            this.expanded = !this.expanded;
        },
    },
};
</script>

