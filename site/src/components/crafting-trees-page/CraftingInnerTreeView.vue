<template>
    <div class="ctree-view">
        <div class="ctree-list" ref="ctreeList">
            <div v-for="tree in visibleTrees" :key="tree.id" class="ctree-recipe-wrap">
                <!-- Recipe body with the visual tree diagram -->
                <div class="ctree-recipe-body">
                    <CraftingTreeBoxNode
                        :name="tree.name"
                        :amount="''"
                        :children="tree.children || []"
                        :is-root="true"
                        :tier="tree.toolTier || null"
                        :recipe-req="tree.recipeReqName || ''"
                        @navigate="$emit('navigateToItem', $event)"
                    />
                </div>
            </div>
            <!-- Infinite scroll sentinel -->
            <div class="infinite-scroll-sentinel" ref="scrollSentinel"></div>
        </div>
    </div>
</template>

<script>
import CraftingTreeBoxNode from './CraftingTreeBoxNode.vue';

const PAGE_SIZE = 20;

export default {
    name: 'CraftingInnerTreeView',
    components: { CraftingTreeBoxNode },
    inject: ['t'],
    props: {
        filteredCraftingTrees: { type: Array, default: () => [] },
    },
    emits: ['navigateToItem'],
    data() {
        return {
            visibleCount: PAGE_SIZE,
            _observer: null,
            _observingSentinel: null,
        };
    },
    computed: {
        visibleTrees() {
            return this.filteredCraftingTrees.slice(0, this.visibleCount);
        },
    },
    watch: {
        filteredCraftingTrees() {
            this.visibleCount = PAGE_SIZE;
        },
    },
    mounted() {
        this.$nextTick(() => this._setupObserver());
    },
    updated() {
        this._setupObserver();
    },
    beforeUnmount() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    },
    methods: {
        _setupObserver() {
            const sentinel = this.$refs.scrollSentinel;
            const root = this.$refs.ctreeList;
            if (!sentinel || !root) {
                if (this._observer) {
                    this._observer.disconnect();
                    this._observer = null;
                    this._observingSentinel = null;
                }
                return;
            }
            if (this._observingSentinel === sentinel) return;
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            this._observingSentinel = sentinel;
            this._observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && this.visibleCount < this.filteredCraftingTrees.length) {
                    this.visibleCount += PAGE_SIZE;
                }
            }, { root, threshold: 0 });
            this._observer.observe(sentinel);
        },
    },
};
</script>

<style scoped>
.ctree-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.ctree-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.1rem 0.25rem 1rem 0.25rem;
}
</style>

