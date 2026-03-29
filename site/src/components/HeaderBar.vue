<template>
<header class="site-header" v-show="translations">
    <button class="hamburger-btn" @click="sidebarCollapsed ? $emit('toggleSidebarCollapse') : $emit('toggleSidebar')" :class="{ active: sidebarOpen, 'show-desktop': sidebarCollapsed }">
        <span></span><span></span><span></span>
    </button>
    <div class="header-brand" v-click-outside="() => packOpen = false">
        <img src="/img/logo.png" alt="S.T.A.L.K.E.R. Anomaly" class="site-logo">
        <div class="header-title-group">
            <button v-if="packs.length > 1" class="header-pack-label header-pack-switcher" @click.stop="packOpen = !packOpen">
                {{ activePack?.name || 'GAMMA' }}<span v-if="activePack?.status" class="pack-status-badge" :style="activePack.statusColor ? { color: activePack.statusColor, background: activePack.statusColor + '26' } : {}">{{ activePack.status }}</span>
                <svg class="pack-chevron" :class="{ open: packOpen }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-else class="header-pack-label">{{ activePack?.name || 'GAMMA' }}</div>
            <h1>{{ t('app_label_database') }}</h1>
        </div>
        <div class="pack-menu" v-show="packOpen">
            <button v-for="p in sortedPacks" :key="p.id" class="pack-menu-item" :class="{ active: activePack?.id === p.id }" @click="$emit('switchPack', p); packOpen = false">
                {{ p.name }}<span v-if="p.status" class="pack-status-badge" :style="p.statusColor ? { color: p.statusColor, background: p.statusColor + '26' } : {}">{{ p.status }}</span>
            </button>
        </div>
    </div>
    <!-- Desktop: inline items -->
    <div class="header-links header-desktop-items" v-if="activePack?.links">
        <a v-for="link in activePack.links" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="header-link" v-tooltip="t('app_link_' + link.icon.replace('globe', 'website')) + ' ' + activePack?.name">
            <svg v-if="link.icon === 'discord'" width="20" height="20" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.2a58.9 58.9 0 0017.7 9 .2.2 0 00.3-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1 58.7 58.7 0 0017.7-9 .2.2 0 00.1-.2c1.4-15.1-2.4-28.2-10.1-39.8a.2.2 0 00-.1-.1zM23.7 37.3c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.1 6.3 7-2.8 7-6.3 7zm23.2 0c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.1 6.3 7-2.8 7-6.3 7z"/></svg>
            <svg v-else-if="link.icon === 'github'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <component v-else :is="iconMap[link.icon]" :size="20" />
        </a>
    </div>

    <!-- Mobile: overflow menu -->
    <button class="header-link header-mobile-items" @click="overflowOpen = !overflowOpen">
        <LucideEllipsisVertical :size="16" />
        <span v-if="hasUnseenReleaseNotes" class="release-notes-badge"></span>
    </button>

    <!-- Right drawer (mobile overflow) -->
    <Teleport to="body">
    <Transition name="fade">
    <div v-if="overflowOpen" class="header-drawer-backdrop" @click.self="overflowOpen = false"></div>
    </Transition>
    <Transition name="drawer-right">
    <nav v-if="overflowOpen" class="header-drawer" @click.stop>
        <div class="header-drawer-top">
            <button class="header-drawer-close" @click.stop="overflowOpen = false">&times;</button>
        </div>
        <template v-if="packs.length > 1">
            <div class="header-drawer-label">{{ t('app_drawer_pack') || 'Pack' }}</div>
            <button class="header-drawer-item" v-for="p in sortedPacks" :key="p.id" :class="{ active: activePack?.id === p.id }" @click="$emit('switchPack', p); overflowOpen = false">
                <span>{{ p.name }}</span>
                <span v-if="p.status" class="pack-status-badge" :style="p.statusColor ? { color: p.statusColor, background: p.statusColor + '26' } : {}">{{ p.status }}</span>
            </button>
            <div class="header-drawer-divider"></div>
        </template>
        <template v-if="activePack?.links">
            <div class="header-drawer-label">{{ t('app_drawer_links') || 'Links' }}</div>
            <a v-for="link in activePack.links" :key="link.url" :href="link.url" target="_blank" rel="noopener" class="header-drawer-item" @click="overflowOpen = false">
                <svg v-if="link.icon === 'discord'" width="16" height="16" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.2a58.9 58.9 0 0017.7 9 .2.2 0 00.3-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1 58.7 58.7 0 0017.7-9 .2.2 0 00.1-.2c1.4-15.1-2.4-28.2-10.1-39.8a.2.2 0 00-.1-.1zM23.7 37.3c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.1 6.3 7-2.8 7-6.3 7zm23.2 0c-3.4 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.1 6.3 7-2.8 7-6.3 7z"/></svg>
                <svg v-else-if="link.icon === 'github'" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <component v-else :is="iconMap[link.icon]" :size="16" />
                <span>{{ t('app_link_' + link.icon.replace('globe', 'website')) }} {{ activePack?.name }}</span>
            </a>
            <div class="header-drawer-divider"></div>
        </template>
        <div class="header-drawer-label">{{ t('app_drawer_language') || 'Language' }}</div>
        <button class="header-drawer-item" v-for="l in LOCALES" :key="l.id" :class="{ active: locale === l.id }" @click="$emit('changeLocale', l.id); overflowOpen = false">
            <span class="locale-menu-code">{{ l.id.toUpperCase() }}</span>
            <span>{{ l.label }}</span>
        </button>
        <div class="header-drawer-divider"></div>
        <button class="header-drawer-item" @click="$emit('openShortcutHelp'); overflowOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h4"/><path d="M14 8h4"/><path d="M6 12h3"/><path d="M15 12h3"/><path d="M10 12h4"/><path d="M8 16h8"/></svg>
            <span>{{ t('app_shortcuts_title') }}</span>
        </button>
        <a href="release-notes/" class="header-drawer-item" @click="overflowOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg>
            <span>{{ t('app_release_notes') }}</span>
            <span v-if="hasUnseenReleaseNotes" class="release-notes-badge" style="position:static;margin-left:auto"></span>
        </a>
    </nav>
    </Transition>
    </Teleport>

    <!-- Desktop: inline search -->
    <div class="global-search header-desktop-items" v-click-outside="() => $emit('clearGlobalQuery')">
        <span class="search-hint" v-show="!searchFocused && !globalQuery" @click="$refs.searchInput.focus()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Type <kbd>/</kbd> to search
        </span>
        <input
            ref="searchInput"
            type="text"
            :value="globalQuery"
            @input="$emit('update:globalQuery', $event.target.value); $emit('search')"
            @keydown.escape.stop="$emit('escapeSearch')"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
        >
        <div class="search-dropdown" v-show="globalQuery.trim()">
            <a v-for="item in globalResults" :key="item.id" href="#" @click.prevent="$emit('selectSearchResult', item.id)">
                <span>{{ tName(item) }}<template v-if="!tName(item).includes('[')"> <small class="search-id-hint">[{{ item.id }}]</small></template></span>
                <span class="search-cat-badge">{{ tCat(item.category) }}</span>
            </a>
            <p v-show="globalResults.length === 0 && globalQuery.trim()" class="no-results">{{ t('app_label_no_results') }}</p>
        </div>
    </div>
    <div class="header-utils header-desktop-items">
        <span class="header-divider"></span>
        <div class="locale-wrap" v-click-outside="() => localeOpen = false">
            <button class="locale-btn" @click.stop="localeOpen = !localeOpen">{{ locale.toUpperCase() }}<svg class="locale-chevron" :class="{ open: localeOpen }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
            <div class="locale-menu" v-show="localeOpen">
                <button v-for="l in LOCALES" :key="l.id" class="locale-menu-item" :class="{ active: locale === l.id }" @click="$emit('changeLocale', l.id); localeOpen = false">
                    <span class="locale-menu-code">{{ l.id.toUpperCase() }}</span>
                    <span class="locale-menu-label">{{ l.label }}</span>
                </button>
            </div>
        </div>
        <button class="header-link shortcut-help-btn" @click="$emit('openShortcutHelp')" v-tooltip="t('app_shortcuts_title')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h4"/><path d="M14 8h4"/><path d="M6 12h3"/><path d="M15 12h3"/><path d="M10 12h4"/><path d="M8 16h8"/></svg>
        </button>
        <a href="release-notes/" class="release-notes-btn header-link" v-tooltip="t('app_release_notes')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg>
            <span v-if="hasUnseenReleaseNotes" class="release-notes-badge"></span>
        </a>
    </div>

    <!-- Mobile: search icon button -->
    <button class="header-link header-mobile-items header-search-btn" @click="mobileSearchOpen = true">
        <LucideSearch :size="16" />
    </button>

    <!-- Mobile: search overlay -->
    <Transition name="fade">
    <div v-if="mobileSearchOpen" class="mobile-search-overlay" @click.self="closeMobileSearch()">
        <div class="mobile-search-bar">
            <input
                ref="mobileSearchInput"
                type="text"
                :value="globalQuery"
                @input="$emit('update:globalQuery', $event.target.value); $emit('search')"
                @keydown.escape.stop="closeMobileSearch()"
                :placeholder="t('app_label_search') || 'Search...'"
            >
            <button class="mobile-search-close" @click="closeMobileSearch()">&times;</button>
            <div class="search-dropdown" v-show="globalQuery.trim()" style="position:absolute;top:100%;left:0;right:0">
                <a v-for="item in globalResults" :key="item.id" href="#" @click.prevent="$emit('selectSearchResult', item.id); closeMobileSearch()">
                    <span>{{ tName(item) }}<template v-if="!tName(item).includes('[')"> <small class="search-id-hint">[{{ item.id }}]</small></template></span>
                    <span class="search-cat-badge">{{ tCat(item.category) }}</span>
                </a>
                <p v-show="globalResults.length === 0 && globalQuery.trim()" class="no-results">{{ t('app_label_no_results') }}</p>
            </div>
        </div>
    </div>
    </Transition>
</header>
</template>

<script>
import { iconMap } from '../icons.js';

export default {
    props: {
        translations: { type: Object, default: null },
        activePack: { type: Object, default: null },
        packs: { type: Array, default: () => [] },
        locale: { type: String, default: 'en' },
        LOCALES: { type: Array, default: () => [] },
        globalQuery: { type: String, default: '' },
        globalResults: { type: Array, default: () => [] },
        hasUnseenReleaseNotes: { type: Boolean, default: false },
        sidebarCollapsed: { type: Boolean, default: false },
        sidebarOpen: { type: Boolean, default: false },
    },
    emits: [
        'toggleSidebarCollapse', 'toggleSidebar', 'switchPack',
        'changeLocale', 'openShortcutHelp', 'clearGlobalQuery',
        'update:globalQuery', 'search', 'escapeSearch', 'selectSearchResult',
    ],
    inject: ['t', 'tName', 'tCat'],
    computed: {
        sortedPacks() {
            return [...this.packs].sort((a, b) => a.name.localeCompare(b.name));
        },
    },
    data() {
        return {
            packOpen: false,
            localeOpen: false,
            searchFocused: false,
            overflowOpen: false,
            mobileSearchOpen: false,
            iconMap,
        };
    },
    watch: {
        mobileSearchOpen(val) {
            if (val) {
                this.$nextTick(() => {
                    this.$refs.mobileSearchInput?.focus();
                });
            }
        },
    },
    methods: {
        focusSearch() {
            if (this.mobileSearchOpen) {
                this.$refs.mobileSearchInput?.focus();
            } else if (this.$refs.searchInput) {
                this.$refs.searchInput.focus();
            } else {
                this.mobileSearchOpen = true;
            }
        },
        closeMobileSearch() {
            this.mobileSearchOpen = false;
            this.$emit('clearGlobalQuery');
        },
    },
};
</script>

<style>
/* ── Right drawer (mobile overflow) ── */
.header-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 160;
}
.header-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 260px;
    max-width: 80vw;
    z-index: 170;
    background: var(--bg);
    border-left: 1px solid var(--border);
    overflow-y: auto;
    padding: 0.5rem 0;
}
.header-drawer-top {
    display: flex;
    justify-content: flex-end;
    padding: 0.3rem 0.5rem;
}
.header-drawer-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
}
.header-drawer-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.08);
}
.header-drawer-label {
    padding: 0.5rem 1rem 0.2rem;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    opacity: 0.6;
}
.header-drawer-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.55rem 1rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    text-align: left;
    text-decoration: none;
    min-height: 44px;
}
.header-drawer-item:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
}
.header-drawer-item.active {
    color: var(--accent);
}
.header-drawer-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0.3rem 0.75rem;
}
.drawer-right-enter-active,
.drawer-right-leave-active {
    transition: transform 0.25s ease;
}
.drawer-right-enter-from,
.drawer-right-leave-to {
    transform: translateX(100%);
}

/* ── Mobile search overlay ── */
.mobile-search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 1rem;
}
.mobile-search-bar {
    position: relative;
    width: 100%;
    max-width: 32rem;
    display: flex;
    gap: 0.4rem;
    margin-top: 0.5rem;
}
.mobile-search-bar input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 1rem;
    outline: none;
}
.mobile-search-bar input:focus {
    border-color: var(--accent);
}
.mobile-search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 1.3rem;
    cursor: pointer;
}
.mobile-search-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.12);
}
</style>
