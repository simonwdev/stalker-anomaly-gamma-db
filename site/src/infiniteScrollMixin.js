const BATCH = 50;

export const infiniteScrollMixin = {
    data() {
        return { infiniteScrollLimit: BATCH };
    },
    computed: {
        visibleItems() {
            return this.items.slice(0, this.infiniteScrollLimit);
        },
        hasMore() {
            return this.infiniteScrollLimit < this.items.length;
        },
    },
    watch: {
        items() {
            this.infiniteScrollLimit = BATCH;
        },
    },
    mounted() {
        this._infiniteObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && this.hasMore) {
                    this.infiniteScrollLimit += BATCH;
                }
            },
            { root: this.$el, rootMargin: '0px 0px 300px 0px' }
        );
        this.$nextTick(() => {
            const sentinel = this.$refs.infiniteScrollSentinel;
            if (sentinel) this._infiniteObserver.observe(sentinel);
        });
    },
    beforeUnmount() {
        this._infiniteObserver?.disconnect();
    },
};

