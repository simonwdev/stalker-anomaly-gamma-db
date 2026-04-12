<template>
    <div class="ctree-node-layout">
        <!-- Node box -->
        <div
            class="ctree-node"
            :class="[isRoot ? 'ctree-node--root' : 'ctree-node--child', { 'ctree-node--clickable': !!nodeItem && !isRoot }]"
            @click.stop="!isRoot && nodeItem && $emit('navigate', nodeItem.id)"
        >
            <img
                v-if="nodeItem && nodeItem.id"
                class="ctree-node-icon"
                :src="`img/icons/${nodeItem.id}.png`"
                alt=""
                @error="$event.target.style.display = 'none'"
            />
            <div class="ctree-node-name">
                <a v-if="isRoot && nodeItem" href="#" @click.prevent.stop="$emit('navigate', nodeItem.id)">{{ label }}</a>
                <a v-else-if="!isRoot && nodeItem" href="#" @click.prevent.stop="$emit('navigate', nodeItem.id)">{{ label }}</a>
                <span v-else class="ctree-node-raw">{{ label }}</span>
            </div>
            <div v-if="amount" class="ctree-node-amount">{{ amount }}</div>
            <span v-if="isRoot && tier" class="ctree-node-tier" :class="'ctree-tier-' + tier">
                {{ t('app_craft_toolkit_' + tier) }}
            </span>
            <div v-if="isRoot && recipeReq" class="ctree-node-req">{{ t(recipeReq) }}</div>
        </div>

        <!-- Children column -->
        <div class="ctree-right" v-if="children && children.length">
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
    computed: {
        nodeItem() {
            return this.findItemByName(this.name) || null;
        },
        label() {
            return this.t(this.name);
        },
    },
};
</script>

