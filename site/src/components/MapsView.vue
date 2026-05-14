<template>
  <div class="maps-view" @click="onViewClick" @dragover.prevent @dragenter="onViewDragEnter" @dragleave="onViewDragLeave">
    <div ref="mapContainer" class="map-container"></div>

    <!-- Debug overlay -->
    <div v-if="debugMode" class="map-debug-overlay">
      <div>Z{{ currentZoom }} · {{ tileStatus }} · {{ tileSource }}</div>
      <div>{{ debugCursorInfo }}</div>
      <div>{{ debugMarkerCount }}</div>
    </div>

    <!-- Floating tooltip -->
    <div ref="mapTooltip" class="map-float-tooltip" v-show="tooltipVisible">
      <div class="map-float-tooltip-content" v-html="tooltipHtml"></div>
      <div ref="mapTooltipArrow" class="map-float-tooltip-arrow"></div>
    </div>

    <!-- Info tooltip -->
    <div ref="infoTooltip" class="map-info-tooltip" v-show="infoTooltipVisible">
      <div class="map-info-tooltip-content">
        <LucideInfo :size="13" class="map-info-tooltip-icon" />
        <span>{{ infoTooltipText }}</span>
      </div>
      <div ref="infoTooltipArrow" class="map-info-tooltip-arrow"></div>
    </div>

    <!-- Search bar -->
    <div class="map-search" :class="{ open: searchOpen }">
      <div class="map-search-input-wrap">
        <LucideSearch :size="14" class="map-search-icon" />
        <input
          ref="searchInput"
          type="text"
          v-model="searchQuery"
          :placeholder="t('app_maps_search_placeholder')"
          class="map-search-input"
          @focus="searchOpen = true"
          @keydown.escape.stop="closeSearch"
          @keydown.up.prevent="searchMove(-1)"
          @keydown.down.prevent="searchMove(1)"
          @keydown.enter.prevent="searchConfirm"
        />
        <button v-if="searchQuery" class="map-search-clear" @click="searchQuery = ''; $refs.searchInput.focus()">
          <LucideX :size="12" />
        </button>
      </div>
      <div v-if="searchOpen && searchResults.length > 0" class="map-search-results" ref="searchResultsEl">
        <button
          v-for="(item, idx) in searchResults"
          :key="item.key"
          class="map-search-result"
          :class="{ active: idx === searchActiveIdx }"
          @click="searchSelect(item)"
          @mouseenter="searchActiveIdx = idx"
        >
          <span class="map-search-result-type" :style="{ color: item.color }">{{ item.typeLabel }}</span>
          <span class="map-search-result-name">{{ item.title }}</span>
          <span class="map-search-result-level">{{ item.levelName }}</span>
        </button>
      </div>
      <div v-else-if="searchOpen && searchQuery.length >= 2 && searchResults.length === 0" class="map-search-empty">
        No results
      </div>
    </div>

    <!-- Overlay control panel + save button -->
    <div class="map-controls-col">
    <div class="map-overlay-panel" :class="{ collapsed: !panelOpen }">
      <button class="map-overlay-toggle" @click="panelOpen = !panelOpen; saveState()" :title="panelOpen ? 'Collapse' : 'Map layers'">
        <LucideLayers :size="16" v-if="!panelOpen" />
        <LucideChevronLeft :size="16" v-else />
      </button>
      <div class="map-overlay-body" v-show="panelOpen">
        <div class="map-overlay-section">
          <div class="map-overlay-heading">Game Data</div>
          <template v-for="layer in baseLayers" :key="layer.id">
            <label class="map-overlay-item">
              <input type="checkbox" :checked="layer.visible" @change="toggleLayer(layer.id)" />
              <span class="map-overlay-item-label">{{ layer.label }}</span>
              <span
                v-if="layer.id === 'faction-territory'"
                class="map-overlay-info-icon"
                @mouseenter="showInfoTooltip($event.currentTarget, t('app_maps_faction_territory_info'))"
                @mouseleave="hideInfoTooltip()"
              >
                <LucideInfo :size="11" />
              </span>
            </label>
            <div v-if="layer.id === 'faction-territory' && layer.visible" class="map-overlay-legend">
              <span v-for="(rgb, fac) in factionTerritoryColors" :key="fac" class="map-legend-item">
                <span class="map-overlay-swatch" :style="{ background: `rgb(${rgb.join(',')})` }"></span>
                <span>{{ factionName(fac) }}</span>
              </span>
            </div>
          </template>
          <template v-for="layer in entityLayers" :key="layer.id">
            <label class="map-overlay-item">
              <input type="checkbox" :checked="layer.visible" @change="toggleLayer(layer.id)" />
              <span class="map-overlay-item-label">{{ layer.label }}</span>
              <span
                v-if="layer.id === 'named_npc'"
                class="map-overlay-info-icon"
                @mouseenter="showInfoTooltip($event.currentTarget, t('app_maps_notable_characters_info'))"
                @mouseleave="hideInfoTooltip()"
              >
                <LucideInfo :size="11" />
              </span>
            </label>
            <div v-if="layer.id === 'named_npc' && layer.visible" class="map-overlay-legend">
              <span v-for="(color, role) in npcRoleColors" :key="role" class="map-legend-item">
                <svg class="map-legend-pin" viewBox="0 0 368 368" width="14" height="18">
                  <path d="M184.277,0c-71.683,0-130,58.317-130,130c0,87.26,119.188,229.855,124.263,235.883c1.417,1.685,3.504,2.66,5.705,2.67c0.011,0,0.021,0,0.032,0c2.189,0,4.271-0.957,5.696-2.621c5.075-5.926,124.304-146.165,124.304-235.932C314.276,58.317,255.96,0,184.277,0z" :fill="color" fill-opacity="0.85" :style="{ stroke: 'var(--color-overlay-black-60)' }" stroke-width="12"/>
                </svg>
                <span>{{ role.charAt(0).toUpperCase() + role.slice(1) }}</span>
              </span>
            </div>
          </template>
        </div>
        <div v-if="playerPosition" class="map-overlay-section">
          <div class="map-overlay-heading">Save Data</div>
          <label class="map-overlay-item">
            <input type="checkbox" :checked="playerLayerVisible" @change="togglePlayerLayer" />
            <span class="map-overlay-item-label">Position</span>
            <button class="map-player-goto-btn" @click.prevent="flyToPlayer" title="Go to player">
              <LucideCrosshair :size="10" />
            </button>
          </label>
          <label v-if="saveMapData?.stashPositions.length" class="map-overlay-item">
            <input type="checkbox" :checked="stashLayerVisible" @change="toggleStashLayer" />
            <span class="map-overlay-item-label">Stash</span>
          </label>
          <label class="map-overlay-item">
            <input type="checkbox" :checked="anomalyLayerVisible" @change="toggleAnomalyLayer" />
            <span class="map-overlay-item-label">Anomalies</span>
            <span
              class="map-overlay-info-icon"
              @mouseenter="showInfoTooltip($event.currentTarget, 'Anomalies are dynamic and will change during the game.')"
              @mouseleave="hideInfoTooltip()"
            >
              <LucideInfo :size="11" />
            </span>
          </label>
        </div>
        <div class="map-overlay-section">
          <label class="map-overlay-item">
            <input type="checkbox" :checked="debugMode" @change="debugMode = !debugMode; saveState()" />
            <span class="map-overlay-item-label map-debug-label">Debug Mode</span>
          </label>
          <label v-if="debugMode" class="map-overlay-item">
            <input type="checkbox" :checked="localTiles" @change="localTiles = !localTiles; saveState()" />
            <span class="map-overlay-item-label map-debug-label">Serve local tiles</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Save import panel -->
    <div class="map-save-panel" :class="{ collapsed: !savePanelOpen }">
      <button class="map-save-toggle" @click="savePanelOpen = !savePanelOpen; saveState()" :title="savePanelOpen ? 'Collapse' : 'Save import'">
        <LucideFileUp :size="16" v-if="!savePanelOpen" />
        <LucideChevronLeft :size="16" v-else />
        <span v-if="!savePanelOpen && playerPosition" class="map-save-dot"></span>
      </button>
      <div class="map-save-body" v-show="savePanelOpen">
        <!-- Loaded state -->
        <template v-if="playerPosition">
          <div class="map-save-status">
            <div class="map-save-player-name">{{ playerPosition.name || 'Unknown Stalker' }}</div>
            <div class="map-save-location">
              <LucideMapPin :size="12" class="map-save-location-icon" />
              <span>{{ playerLevelName }}</span>
            </div>
            <div v-if="playerPosition.savedAt" class="map-save-date">{{ playerPosition.savedAt }}</div>
            <div class="map-save-actions">
              <label class="map-save-action-btn" title="Import a different save">
                <LucideFileUp :size="12" />
                <span>Import</span>
                <input type="file" accept=".scop" @change="onScopImport" style="display:none" />
              </label>
              <button class="map-save-action-btn map-save-action-clear" @click="clearPlayer" title="Clear save data">
                <LucideX :size="12" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </template>
        <!-- Empty state: dropzone -->
        <template v-else>
          <div
            class="map-save-dropzone"
            :class="{ dragover: saveDragOver }"
            @dragover.prevent="saveDragOver = true"
            @dragleave.prevent="saveDragOver = false"
            @drop.prevent="onScopDrop"
          >
            <LucideUpload :size="20" class="map-save-dropzone-icon" />
            <span class="map-save-dropzone-label">Drop .scop file</span>
            <label class="map-save-browse-btn">
              Browse
              <input type="file" accept=".scop" @change="onScopImport" style="display:none" />
            </label>
          </div>
        </template>
        <div v-if="playerImportError" class="map-save-error">{{ playerImportError }}</div>
      </div>
    </div>
    </div><!-- /map-controls-col -->

    <!-- Full-screen drag overlay -->
    <div
      v-show="globalDragOver"
      class="map-drag-overlay"
      @dragover.prevent
      @drop.prevent="onGlobalDrop"
    >
      <div class="map-drag-overlay-content">
        <LucideUpload :size="32" />
        <span>Drop save file to import</span>
      </div>
    </div>

    <div v-if="!debugMode" class="maps-banner">
      <LucideInfo :size="14" />
      <span class="maps-banner-text">{{ t('app_maps_wip_banner') }}</span>
      <a href="https://discord.com/channels/912320241713958912/1484195028891861022" target="_blank" rel="noopener" class="maps-banner-link">
        <LucideMessageCircle :size="12" />
        {{ t('app_maps_discord_link') }}
      </a>
      <a href="https://discord.gg/stalker-gamma" target="_blank" rel="noopener" class="maps-banner-link">
        {{ t('app_maps_discord_join') }}
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue';
import { computePosition, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TileMetadata {
  tileSize: number;
  maxZoom: number;
  baseMaxZoom: number;
  format: string;
  detailFormat: string;
  imageWidth: number;
  imageHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  canvasSize: number;
}

interface MapLayer {
  id: string;
  label: string;
  visible: boolean;
  group: L.LayerGroup | null;
}

export default defineComponent({
  name: 'MapsView',
  inject: ['t'],
  props: {
    packId: { type: String, default: '' },
    visible: { type: Boolean, default: true },
  },
  setup(props) {
    const mapContainer = ref<HTMLElement | null>(null);
    const currentZoom = ref(0);
    const tileStatus = ref('');
    const tileSource = ref('');
    const debugCursorInfo = ref('');
    const debugMarkerCount = ref('');
    const mapTooltip = ref<HTMLElement | null>(null);
    const mapTooltipArrow = ref<HTMLElement | null>(null);
    const tooltipVisible = ref(false);
    const tooltipHtml = ref('');
    let tooltipCleanup: (() => void) | null = null;

    const infoTooltip = ref<HTMLElement | null>(null);
    const infoTooltipArrow = ref<HTMLElement | null>(null);
    const infoTooltipVisible = ref(false);
    const infoTooltipText = ref('');
    let infoTooltipCleanup: (() => void) | null = null;

    function showInfoTooltip(refEl: HTMLElement, text: string) {
      infoTooltipText.value = text;
      infoTooltipVisible.value = true;
      if (infoTooltipCleanup) infoTooltipCleanup();
      const tip = infoTooltip.value!;
      const arrowEl = infoTooltipArrow.value!;
      infoTooltipCleanup = autoUpdate(refEl, tip, () => {
        computePosition(refEl, tip, {
          placement: 'top',
          middleware: [
            offset(8),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: arrowEl }),
          ],
        }).then(({ x, y, placement: p, middlewareData }) => {
          Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
          const side: Record<string, string> = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
          const staticSide = side[p.split('-')[0]];
          if (middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow;
            Object.assign(arrowEl.style, {
              left: ax != null ? `${ax}px` : '',
              top: ay != null ? `${ay}px` : '',
              [staticSide]: '-4px',
            });
          }
        });
      });
    }

    function hideInfoTooltip() {
      infoTooltipVisible.value = false;
      if (infoTooltipCleanup) { infoTooltipCleanup(); infoTooltipCleanup = null; }
    }

    const searchInput = ref<HTMLElement | null>(null);
    const searchResultsEl = ref<HTMLElement | null>(null);
    const searchOpen = ref(false);
    const searchQuery = ref('');
    const searchActiveIdx = ref(0);

    interface SearchItem {
      key: string;
      title: string;
      typeLabel: string;
      color: string;
      levelName: string;
      latlng: L.LatLng;
      layerId: string;
      marker?: L.Layer;
    }
    const allSearchItems = ref<SearchItem[]>([]);

    const searchResults = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (q.length < 2) return [];
      const words = q.split(/\s+/);
      const scored: { item: SearchItem; score: number }[] = [];
      for (const item of allSearchItems.value) {
        const hay = `${item.title} ${item.levelName} ${item.typeLabel}`.toLowerCase();
        let matched = true;
        let score = 0;
        for (const w of words) {
          const idx = hay.indexOf(w);
          if (idx === -1) { matched = false; break; }
          // Boost prefix matches on title
          if (item.title.toLowerCase().startsWith(w)) score += 10;
          else if (item.title.toLowerCase().includes(w)) score += 5;
          else score += 1;
        }
        if (matched) scored.push({ item, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 12).map(s => s.item);
    });

    function closeSearch() {
      searchOpen.value = false;
      searchQuery.value = '';
      searchActiveIdx.value = 0;
      searchInput.value?.blur();
    }

    function searchMove(dir: number) {
      const len = searchResults.value.length;
      if (!len) return;
      searchActiveIdx.value = (searchActiveIdx.value + dir + len) % len;
      // Scroll active item into view
      const el = searchResultsEl.value;
      if (el) {
        const active = el.children[searchActiveIdx.value] as HTMLElement;
        if (active) active.scrollIntoView({ block: 'nearest' });
      }
    }

    function searchConfirm() {
      const item = searchResults.value[searchActiveIdx.value];
      if (item) searchSelect(item);
    }

    let highlightMarker: L.CircleMarker | null = null;

    function searchSelect(item: SearchItem) {
      if (!map) return;
      closeSearch();

      // Fly to the location
      const targetZoom = Math.max(map.getZoom(), 6);
      map.flyTo(item.latlng, targetZoom, { duration: 0.8 });

      // Pulse highlight ring
      if (highlightMarker) {
        map.removeLayer(highlightMarker);
        highlightMarker = null;
      }
      highlightMarker = L.circleMarker(item.latlng, {
        radius: 20,
        color: 'var(--color-accent)',
        weight: 2,
        fillColor: 'var(--color-accent)',
        fillOpacity: 0.2,
        className: 'map-search-highlight',
      }).addTo(map);

      // Remove highlight after animation
      setTimeout(() => {
        if (highlightMarker && map) {
          map.removeLayer(highlightMarker);
          highlightMarker = null;
        }
      }, 2500);
    }

    function onViewClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.map-search') && searchOpen.value) closeSearch();
    }

    watch(searchQuery, () => { searchActiveIdx.value = 0; });

    const t = inject<(key: string) => string>('t', (k) => k);
    const factionIcon = inject<(name: string) => string>('factionIcon', () => '');

    function showTooltip(ref: any, contentFn: () => string) {
      tooltipHtml.value = contentFn();
      tooltipVisible.value = true;
      if (tooltipCleanup) tooltipCleanup();
      const tip = mapTooltip.value!;
      const arrowEl = mapTooltipArrow.value!;
      tooltipCleanup = autoUpdate(ref, tip, () => {
        computePosition(ref, tip, {
          placement: 'top',
          middleware: [
            offset(10),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: arrowEl }),
          ],
        }).then(({ x, y, placement: p, middlewareData }) => {
          Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
          const side: Record<string, string> = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
          const staticSide = side[p.split('-')[0]];
          if (middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow;
            Object.assign(arrowEl.style, {
              left: ax != null ? `${ax}px` : '',
              top: ay != null ? `${ay}px` : '',
              [staticSide]: '-4px',
            });
          }
        });
      });
    }

    function hideTooltip() {
      tooltipVisible.value = false;
      if (tooltipCleanup) { tooltipCleanup(); tooltipCleanup = null; }
    }

    // Create a floating-ui virtual element from a Leaflet mouse event.
    // Works for canvas-rendered markers that have no DOM element.
    function virtualRefFromEvent(e: any) {
      const el = e.target._icon || e.target._path || e.target.getElement?.();
      if (el) return el;
      // Canvas marker — use the marker's screen position
      const pt = e.target._map?.latLngToContainerPoint(e.latlng);
      if (!pt) return null;
      const mapEl = e.target._map.getContainer();
      const rect = mapEl.getBoundingClientRect();
      const x = rect.left + pt.x;
      const y = rect.top + pt.y;
      return {
        getBoundingClientRect: () => ({ x, y, top: y, left: x, bottom: y, right: x, width: 0, height: 0 }),
      };
    }

    function bindMapTooltip(marker: L.Layer, contentFn: () => string) {
      marker.on('mouseover', (e: any) => {
        const ref = virtualRefFromEvent(e);
        if (ref) showTooltip(ref, contentFn);
      });
      marker.on('mouseout', () => hideTooltip());
    }

    // SVG path constants for map markers (viewBox 0 0 512 512, scaled 0.7 with 76.8 offset)
    const SVG_PERSON = 'M250.882 22.802c-23.366 3.035-44.553 30.444-44.553 65.935 0 19.558 6.771 36.856 16.695 48.815l11.84 14.263-18.217 3.424c-12.9 2.425-22.358 9.24-30.443 20.336-8.085 11.097-14.266 26.558-18.598 44.375-7.843 32.28-9.568 71.693-9.842 106.436h42.868l11.771 157.836c29.894 6.748 61.811 6.51 90.602.025l10.414-157.86h40.816c-.027-35.169-.477-75.126-7.584-107.65-3.918-17.934-9.858-33.372-18.04-44.343-8.185-10.97-18.08-17.745-32.563-19.989l-18.592-2.88 11.736-14.704c9.495-11.897 15.932-28.997 15.932-48.082 0-37.838-23.655-65.844-49.399-65.844z';
    const SVG_TRANSFORM = 'translate(76.8,76.8) scale(0.7)';

    function npcMarkerSvg(size: number, color: string) {
      return `<svg viewBox="0 0 20 20" width="${size}" height="${size}"><circle cx="10" cy="10" r="8" fill="none" stroke="${color}" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="${color}"/></svg>`;
    }

    const factionTerritoryColors: Record<string, [number, number, number]> = {
      stalker:  [255, 200, 0],     // yellow
      duty:     [220, 40, 40],     // red
      freedom:  [0, 180, 0],      // green
      bandit:   [220, 220, 220],   // white
      army:     [160, 50, 220],    // purple
      monolith: [0, 220, 220],     // aqua
      killer:   [50, 50, 50],       // dark gray
      ecolog:   [0, 200, 180],     // turquoise
      csky:     [50, 120, 255],    // blue
      renegade: [0, 100, 40],      // dark green
      greh:     [255, 140, 0],     // orange
      isg:      [128, 0, 0],       // maroon
      zombied:  [180, 180, 150],   // grey
    };

    const factionDisplayNames: Record<string, string> = {
      stalker: 'Free Stalkers', duty: 'Duty', dolg: 'Duty',
      freedom: 'Freedom', bandit: 'Bandits', army: 'Military',
      monolith: 'Monolith', killer: 'Mercenary', merc: 'Mercenary',
      ecolog: 'Ecologists', csky: 'Clear Sky', renegade: 'Renegades',
      greh: 'Sin', isg: 'UNISG', zombied: 'Zombified',
    };
    function factionName(id: string) {
      return factionDisplayNames[id] || t(id);
    }

    const npcRoleColors: Record<string, string> = {
      trader:   'var(--color-map-trader)',
      mechanic: 'var(--color-map-mechanic)',
      medic:    'var(--color-map-medic)',
      barman:   'var(--color-orange-bright)',
      guide:    'var(--color-map-guide)',
      leader:   'var(--color-map-leader)',
      arena:    'var(--color-map-arena)',
      npc:      'var(--color-map-npc)',
    };
    // Restore panel & layer state from localStorage
    const STORAGE_KEY = 'map-overlay-state';
    function loadState(): { panelOpen: boolean; visibleLayers: string[]; debugMode?: boolean; localTiles?: boolean; playerLayerVisible?: boolean; stashLayerVisible?: boolean; anomalyLayerVisible?: boolean; savePanelOpen?: boolean } | null {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }
    function saveState() {
      const visible = layers.filter(l => l.visible).map(l => l.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        panelOpen: panelOpen.value, visibleLayers: visible,
        debugMode: debugMode.value, localTiles: localTiles.value,
        playerLayerVisible: playerLayerVisible.value,
        stashLayerVisible: stashLayerVisible.value,
        anomalyLayerVisible: anomalyLayerVisible.value,
        savePanelOpen: savePanelOpen.value,
      }));
    }

    const saved = loadState();
    const panelOpen = ref(saved?.panelOpen ?? false);
    const debugMode = ref(saved?.debugMode ?? false);
    const localTiles = ref(saved?.localTiles ?? false);

    let map: L.Map | null = null;
    let relayoutMarkers: (() => void) | null = null;
    let updateNpcIconsFn: (() => void) | null = null;

    // --- Save import flyout + player position ---
    const PLAYER_POS_KEY = 'map-player-position';
    const playerPosition = ref<{ mapX: number; mapY: number; levelId: string; name: string; savedAt: string } | null>(null);
    const playerLayerVisible = ref(saved?.playerLayerVisible ?? true);
    const stashLayerVisible = ref(saved?.stashLayerVisible ?? true);
    const anomalyLayerVisible = ref(saved?.anomalyLayerVisible ?? false);
    const playerImportError = ref('');
    const savePanelOpen = ref(saved?.savePanelOpen ?? false);
    const saveDragOver = ref(false);
    const globalDragOver = ref(false);
    let playerMarker: L.Marker | null = null;
    let playerMarkerPulse: L.CircleMarker | null = null;
    let stashMarkers: L.Marker[] = [];
    let anomalyMarkerGroup: L.LayerGroup | null = null;
    let levelsDataRef: any = null; // set during initMap
    let canvasRendererRef: L.Canvas | null = null;

    // Save data stored separately from player position (can be large for anomalies)
    const SAVE_DATA_KEY = 'map-save-data';
    interface SaveMapData {
      stashPositions: Array<{ mapX: number; mapY: number; levelId: string }>;
      anomalies: Array<{ mapX: number; mapY: number; section: string; levelId: string }>;
    }
    const saveMapData = ref<SaveMapData | null>(null);

    const playerLevelName = computed(() => {
      if (!playerPosition.value || !levelsDataRef) return '';
      const level = levelsDataRef.levels.find((l: any) => l.id === playerPosition.value!.levelId);
      return level?.name || playerPosition.value.levelId;
    });

    function worldToMapPixels(x: number, z: number, levelId: string, levelsData: any): { mapX: number; mapY: number } | null {
      const level = levelsData.levels.find((l: any) => l.id === levelId);
      if (!level?.worldBounds || !level?.rawRect) return null;
      const wb = level.worldBounds;
      const rr = level.rawRect;
      const rangeX = wb.maxX - wb.minX;
      const rangeZ = wb.maxZ - wb.minZ;
      const normX = rangeX > 0 ? (x - wb.minX) / rangeX : 0.5;
      const normZ = rangeZ > 0 ? (z - wb.minZ) / rangeZ : 0.5;
      return {
        mapX: rr.x1 + normX * (rr.x2 - rr.x1),
        mapY: rr.y2 - normZ * (rr.y2 - rr.y1),
      };
    }

    function placePlayerMarker(pos: { mapX: number; mapY: number }) {
      if (!map) return;
      const imgW = (map as any)._imgW as number;
      const imgH = (map as any)._imgH as number;
      const globalMaxZoom = (map as any)._globalMaxZoom as number;
      const latlng = map.unproject([pos.mapX / 1024 * imgW, pos.mapY / 2634 * imgH], globalMaxZoom);

      if (playerMarkerPulse) { map.removeLayer(playerMarkerPulse); playerMarkerPulse = null; }
      if (playerMarker) { map.removeLayer(playerMarker); playerMarker = null; }

      // Pulsing ring
      playerMarkerPulse = L.circleMarker(latlng, {
        radius: 12,
        color: '#76ff03',
        weight: 2,
        fillColor: '#76ff03',
        fillOpacity: 0.15,
        interactive: false,
        className: 'map-player-pulse',
      }).addTo(map);

      // Player dot
      playerMarker = L.marker(latlng, {
        icon: L.divIcon({
          className: 'map-player-marker',
          html: `<span class="map-player-dot"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        zIndexOffset: 10000,
      }).addTo(map);

      // Tooltip with player name and level
      const pp = playerPosition.value;
      if (pp) {
        const name = pp.name || 'Unknown Stalker';
        bindMapTooltip(playerMarker, () => {
          const level = levelsDataRef?.levels.find((l: any) => l.id === pp.levelId);
          const levelName = level?.name || pp.levelId;
          return `<b>${name}</b><br><span style="color:var(--text-secondary)">${levelName}</span>`;
        });
      }
    }

    function removePlayerMarker() {
      if (playerMarkerPulse && map) { map.removeLayer(playerMarkerPulse); playerMarkerPulse = null; }
      if (playerMarker && map) { map.removeLayer(playerMarker); playerMarker = null; }
    }

    function toLatLng(pos: { mapX: number; mapY: number }): L.LatLng {
      const imgW = (map as any)._imgW as number;
      const imgH = (map as any)._imgH as number;
      const maxZ = (map as any)._globalMaxZoom as number;
      return map!.unproject([pos.mapX / 1024 * imgW, pos.mapY / 2634 * imgH], maxZ);
    }

    function placeStashMarkers(positions: Array<{ mapX: number; mapY: number }>) {
      removeStashMarkers();
      if (!map) return;
      for (const pos of positions) {
        const m = L.marker(toLatLng(pos), {
          icon: L.divIcon({
            className: 'map-stash-marker',
            html: `<svg viewBox="0 0 20 20" width="18" height="18"><rect x="3" y="6" width="14" height="11" rx="1.5" fill="none" stroke="#4fc3f7" stroke-width="1.8"/><path d="M6 6V4.5A4 4 0 0 1 14 4.5V6" fill="none" stroke="#4fc3f7" stroke-width="1.8" stroke-linecap="round"/></svg>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          zIndexOffset: 9000,
        }).addTo(map);
        bindMapTooltip(m, () => 'Player Stash');
        stashMarkers.push(m);
      }
    }

    function removeStashMarkers() {
      for (const m of stashMarkers) { if (map) map.removeLayer(m); }
      stashMarkers = [];
    }

    function parseAnomalyName(section: string): { name: string; strength: string } {
      // zone_mine_thermal_weak → { name: "Thermal", strength: "Weak" }
      const strengthMatch = section.match(/_(weak|average|strong|deadly)(?:_\d+)?$/);
      const strength = strengthMatch ? strengthMatch[1].charAt(0).toUpperCase() + strengthMatch[1].slice(1) : '';
      let name = section.replace(/^zone_(mine|field|burning|witches)_?/, '').replace(/_(weak|average|strong|deadly)(?:_\d+)?$/, '');
      if (!name) name = section.replace(/^zone_/, '');
      name = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return { name, strength };
    }

    function placeAnomalyMarkers(anomalies: Array<{ mapX: number; mapY: number; section: string }>) {
      removeAnomalyMarkers();
      if (!map || !canvasRendererRef) return;
      anomalyMarkerGroup = L.layerGroup();
      for (const a of anomalies) {
        const color = anomalyColor(a.section);
        const m = L.circleMarker(toLatLng(a), {
          radius: 4,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.4,
          renderer: canvasRendererRef,
        });
        const { name: aName, strength } = parseAnomalyName(a.section);
        bindMapTooltip(m, () => {
          let html = `<span style="color:${color}">${aName}</span>`;
          if (strength) html += `<br><span style="color:var(--text-secondary);font-size:0.85em">${strength}</span>`;
          if (debugMode.value) html += `<div class="map-debug-info">${a.section}</div>`;
          return html;
        });
        m.addTo(anomalyMarkerGroup!);
      }
      if (map.getZoom() >= 4) anomalyMarkerGroup.addTo(map);
    }

    function removeAnomalyMarkers() {
      if (anomalyMarkerGroup) {
        anomalyMarkerGroup.clearLayers();
        if (map) map.removeLayer(anomalyMarkerGroup);
        anomalyMarkerGroup = null;
      }
    }

    function anomalyColor(section: string): string {
      if (section.includes('thermal') || section.includes('burning') || section.includes('fire')) return '#ff6e40';
      if (section.includes('electric') || section.includes('electra') || section.includes('tesla')) return '#448aff';
      if (section.includes('gravit') || section.includes('teleport') || section.includes('tramplin')) return '#b388ff';
      if (section.includes('radio') || section.includes('acid')) return '#69f0ae';
      if (section.includes('psychic') || section.includes('psi')) return '#ea80fc';
      return '#ffab40'; // default amber
    }

    function flyToPlayer() {
      if (!playerPosition.value || !map) return;
      const imgW = (map as any)._imgW as number;
      const imgH = (map as any)._imgH as number;
      const globalMaxZoom = (map as any)._globalMaxZoom as number;
      const pos = playerPosition.value;
      const latlng = map.unproject([pos.mapX / 1024 * imgW, pos.mapY / 2634 * imgH], globalMaxZoom);
      map.flyTo(latlng, 7, { duration: 0.8 });
    }

    function clearPlayer() {
      removePlayerMarker();
      removeStashMarkers();
      removeAnomalyMarkers();
      playerPosition.value = null;
      saveMapData.value = null;
      playerLayerVisible.value = true;
      stashLayerVisible.value = true;
      anomalyLayerVisible.value = false;
      playerImportError.value = '';
      try { localStorage.removeItem(PLAYER_POS_KEY); } catch {}
      try { localStorage.removeItem(SAVE_DATA_KEY); } catch {}
    }

    function togglePlayerLayer() {
      playerLayerVisible.value = !playerLayerVisible.value;
      if (playerLayerVisible.value && playerPosition.value) {
        placePlayerMarker(playerPosition.value);
      } else {
        removePlayerMarker();
      }
      saveState();
    }

    function toggleStashLayer() {
      stashLayerVisible.value = !stashLayerVisible.value;
      if (stashLayerVisible.value && saveMapData.value?.stashPositions.length) {
        placeStashMarkers(saveMapData.value.stashPositions);
      } else {
        removeStashMarkers();
      }
      saveState();
    }

    function toggleAnomalyLayer() {
      anomalyLayerVisible.value = !anomalyLayerVisible.value;
      if (anomalyLayerVisible.value && saveMapData.value?.anomalies.length) {
        placeAnomalyMarkers(saveMapData.value.anomalies);
      } else {
        removeAnomalyMarkers();
      }
      saveState();
    }

    function extractPlayerName(filename: string): string {
      // Anomaly saves: "PlayerName - quicksave_5.scop" or "PlayerName - save_name.scop"
      const dashIdx = filename.indexOf(' - ');
      if (dashIdx > 0) return filename.substring(0, dashIdx);
      return '';
    }

    function formatSaveDate(timestamp: number): string {
      const d = new Date(timestamp);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function importScopFile(buffer: ArrayBuffer, fileName: string, lastModified: number) {
      playerImportError.value = '';
      try {
        const result = (globalThis as any).ScopParser.parse(buffer, new Set());
        if (!result.actorPosition) {
          playerImportError.value = 'Could not find player position';
          return;
        }

        // Player position
        const ap = result.actorPosition;
        const mapPos = worldToMapPixels(ap.x, ap.z, ap.levelId, levelsDataRef);
        if (!mapPos) {
          playerImportError.value = `Unknown level: ${ap.levelId}`;
          return;
        }
        const name = extractPlayerName(fileName);
        const savedAt = formatSaveDate(lastModified);
        playerPosition.value = { mapX: mapPos.mapX, mapY: mapPos.mapY, levelId: ap.levelId, name, savedAt };
        playerLayerVisible.value = true;
        placePlayerMarker(mapPos);

        // Stash positions
        const stashPositions: SaveMapData['stashPositions'] = [];
        for (const s of result.stashPositions || []) {
          const sp = worldToMapPixels(s.x, s.z, s.levelId, levelsDataRef);
          if (sp) stashPositions.push({ mapX: sp.mapX, mapY: sp.mapY, levelId: s.levelId });
        }

        // Anomaly positions
        const anomalies: SaveMapData['anomalies'] = [];
        for (const a of result.anomalies || []) {
          const ap2 = worldToMapPixels(a.x, a.z, a.levelId, levelsDataRef);
          if (ap2) anomalies.push({ mapX: ap2.mapX, mapY: ap2.mapY, section: a.section, levelId: a.levelId });
        }

        saveMapData.value = { stashPositions, anomalies };

        // Place markers for visible layers
        if (stashLayerVisible.value && stashPositions.length) placeStashMarkers(stashPositions);
        if (anomalyLayerVisible.value && anomalies.length) placeAnomalyMarkers(anomalies);

        // Persist
        try { localStorage.setItem(PLAYER_POS_KEY, JSON.stringify(playerPosition.value)); } catch {}
        try { localStorage.setItem(SAVE_DATA_KEY, JSON.stringify(saveMapData.value)); } catch {}

        flyToPlayer();
      } catch (e: any) {
        playerImportError.value = e.message || 'Failed to parse save file';
      }
    }

    function onScopImport(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      input.value = '';
      readFileAsBuffer(file);
    }

    function onScopDrop(event: DragEvent) {
      saveDragOver.value = false;
      const file = event.dataTransfer?.files[0];
      if (file && file.name.endsWith('.scop')) readFileAsBuffer(file);
    }

    function onGlobalDrop(event: DragEvent) {
      dragCounter = 0;
      globalDragOver.value = false;
      const file = event.dataTransfer?.files[0];
      if (file && file.name.endsWith('.scop')) {
        savePanelOpen.value = true;
        readFileAsBuffer(file);
      }
    }

    function readFileAsBuffer(file: File) {
      playerImportError.value = '';
      const reader = new FileReader();
      reader.onload = () => importScopFile(reader.result as ArrayBuffer, file.name, file.lastModified);
      reader.onerror = () => { playerImportError.value = 'Failed to read file'; };
      reader.readAsArrayBuffer(file);
    }

    // Global drag detection — counter-based to avoid flicker from child elements
    let dragCounter = 0;
    function onViewDragEnter(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      dragCounter++;
      if (dragCounter === 1) globalDragOver.value = true;
    }
    function onViewDragLeave() {
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; globalDragOver.value = false; }
    }

    function buildEntityLayerDefs(packId: string) {
      const defs: {
        id: string; label: string; color: string; radius: number; minZoom: number;
        icon?: string; iconSize?: number; iconZoom?: number;
      }[] = [
        { id: 'campfire',       label: 'Campfires',        color: 'var(--color-orange-bright)', radius: 3, minZoom: 5 },
        ...( packId === 'anomaly-1.5.3' ? [
          { id: 'stash', label: 'Stashes', color: '#4fc3f7', radius: 3, minZoom: 4, icon: '/img/map/stash.svg', iconSize: 18, iconZoom: 6 },
        ] : []),
        { id: 'smart_terrain',  label: 'Locations',         color: '#aaaaaa', radius: 0, minZoom: 5 },
        { id: 'level_changer',  label: 'Level changers',   color: '#08fef8', radius: 4, minZoom: 3 },
        { id: 'named_npc',      label: 'Notable characters', color: '#90caf9', radius: 5, minZoom: 3 },
      ];
      return defs;
    }

    let entityLayerDefs = buildEntityLayerDefs(props.packId);

    const savedLayers = saved?.visibleLayers;
    const layers: MapLayer[] = reactive([
      { id: 'level-labels', label: 'Level names', visible: savedLayers ? savedLayers.includes('level-labels') : true, group: null },
      { id: 'level-bounds', label: 'Level boundaries', visible: savedLayers ? savedLayers.includes('level-bounds') : false, group: null },
      { id: 'faction-territory', label: 'Starting factions', visible: savedLayers ? savedLayers.includes('faction-territory') : false, group: null },
      ...entityLayerDefs.map(d => ({
        id: d.id, label: d.label,
        visible: savedLayers ? savedLayers.includes(d.id) : d.id === 'stash',
        group: null,
      })),
    ]);

    function toggleLayer(id: string) {
      const layer = layers.find(l => l.id === id);
      if (!layer || !map) return;
      layer.visible = !layer.visible;

      // Entity layers have zoom-based visibility
      const entDef = entityLayerDefs.find(d => d.id === id);
      if (entDef && layer.group) {
        if (layer.visible && map.getZoom() >= entDef.minZoom) {
          layer.group.addTo(map);
        } else {
          layer.group.removeFrom(map);
        }
        saveState();
        if (relayoutMarkers) relayoutMarkers();
        return;
      }

      if (layer.visible && layer.group) {
        layer.group.addTo(map);
      } else if (!layer.visible && layer.group) {
        layer.group.removeFrom(map);
      }
      saveState();
      if (relayoutMarkers) relayoutMarkers();
    }

    let initMapId = 0;
    async function initMap() {
      if (!mapContainer.value) return;
      const myId = ++initMapId; // guard against concurrent inits from pack changes

      const TILES_BASE = localTiles.value ? '/tiles' : 'https://tiles.stalker-anomaly-db.com/v2';

      let meta: TileMetadata;
      try {
        const metaRes = await fetch(`${TILES_BASE}/metadata.json`);
        if (myId !== initMapId) return;
        meta = await metaRes.json();
      } catch (e) {
        console.error('Failed to load tile metadata:', e);
        return;
      }

      const { scaledWidth: imgW, scaledHeight: imgH, maxZoom, baseMaxZoom, tileSize } = meta;
      const globalMaxZoom = (meta as any).globalMaxZoom || baseMaxZoom;

      map = L.map(mapContainer.value, {
        crs: L.CRS.Simple,
        minZoom: 2,
        maxZoom,
        zoomSnap: 1,
        zoomDelta: 1,
        attributionControl: false,
      });

      // unproject using globalMaxZoom — that's where the canvas/image pixel
      // dimensions are defined. Higher zooms are per-level detail overlays.
      const imgSouthWest = map.unproject([0, imgH], globalMaxZoom);
      const imgNorthEast = map.unproject([imgW, 0], globalMaxZoom);
      const imageBounds = L.latLngBounds(imgSouthWest, imgNorthEast);

      // Set initial view immediately to prevent "Set map center and zoom first" errors
      const MAP_POS_KEY = 'map-position';
      const savedPos = (() => {
        try { const r = localStorage.getItem(MAP_POS_KEY); return r ? JSON.parse(r) : null; }
        catch { return null; }
      })();
      if (savedPos?.lat != null && savedPos?.lng != null && savedPos?.zoom != null) {
        map.setView([savedPos.lat, savedPos.lng], savedPos.zoom);
      } else {
        const cordonSW = map.unproject([358 / 1024 * imgW, 2434 / 2634 * imgH], globalMaxZoom);
        const cordonNE = map.unproject([564 / 1024 * imgW, 2022 / 2634 * imgH], globalMaxZoom);
        map.fitBounds(L.latLngBounds(cordonSW, cordonNE));
      }

      // Store image dimensions for use outside initMap (player marker, etc.)
      (map as any)._imgW = imgW;
      (map as any)._imgH = imgH;
      (map as any)._globalMaxZoom = globalMaxZoom;

      map.setMaxBounds(imageBounds.pad(0.2));
      map.options.maxBoundsViscosity = 0.8;
      map.on('movestart zoomstart', () => hideTooltip());

      const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      // Base layer: global map (zoom 0-5), upscaled as background at higher zooms
      const baseLayer = L.tileLayer(`${TILES_BASE}/{z}/{x}/{y}.${meta.format}`, {
        tileSize,
        maxZoom,
        maxNativeZoom: globalMaxZoom,
        minZoom: 0,
        noWrap: true,
        bounds: imageBounds,
        errorTileUrl: TRANSPARENT_PIXEL,
      }).addTo(map);

      // Detail layer: per-level high-res PNG tiles with transparency
      // maxNativeZoom is maxZoom-1 so Z7 tiles upscale to Z8 as fallback
      const detailFormat = meta.detailFormat || meta.format;
      const detailLayer = L.tileLayer(`${TILES_BASE}/{z}/{x}/{y}.${detailFormat}`, {
        tileSize,
        maxZoom,
        maxNativeZoom: maxZoom - 1,
        minZoom: baseMaxZoom + 1,
        noWrap: true,
        bounds: imageBounds,
        errorTileUrl: TRANSPARENT_PIXEL,
      }).addTo(map);

      // Crisp max-zoom layer: native tiles where they exist, on top of upscaled
      const crispLayer = L.tileLayer(`${TILES_BASE}/{z}/{x}/{y}.${detailFormat}`, {
        tileSize,
        maxZoom,
        minZoom: maxZoom,
        minNativeZoom: maxZoom,
        noWrap: true,
        bounds: imageBounds,
        errorTileUrl: TRANSPARENT_PIXEL,
      }).addTo(map);

      // Track tile status for zoom indicator
      const tileStats = { loaded: 0, errors: 0 };
      function resetTileStats() { tileStats.loaded = 0; tileStats.errors = 0; updateZoomLabel(); }
      function updateZoomLabel() {
        const z = map!.getZoom();
        let status: string;
        if (z <= baseMaxZoom) {
          status = 'Native (global)';
        } else if (z < maxZoom) {
          status = `Native (detail) · ${tileStats.errors} missing`;
        } else {
          if (tileStats.loaded > 0 && tileStats.errors === 0) {
            status = 'Native (detail)';
          } else if (tileStats.loaded > 0) {
            status = `Mixed · ${tileStats.loaded} native, ${tileStats.errors} upscaled`;
          } else {
            status = 'Upscaled from Z' + (maxZoom - 1);
          }
        }
        currentZoom.value = z;
        tileStatus.value = status;
      }

      baseLayer.on('load', updateZoomLabel);
      detailLayer.on('tileload', () => { tileStats.loaded++; updateZoomLabel(); });
      detailLayer.on('tileerror', () => { tileStats.errors++; updateZoomLabel(); });
      crispLayer.on('tileload', () => { tileStats.loaded++; updateZoomLabel(); });
      crispLayer.on('tileerror', () => { tileStats.errors++; updateZoomLabel(); });
      map.on('zoomstart', resetTileStats);

      // Load level data for overlays
      const levelsRes = await fetch('/data/map-levels.json');
      const levelsData = await levelsRes.json();
      if (myId !== initMapId) return; // stale init
      levelsDataRef = levelsData;

      // Helper: convert normalized bounds to LatLng
      function boundsToLatLng(b: { x1: number; y1: number; x2: number; y2: number }) {
        const sw = map!.unproject([b.x1 * imgW, b.y2 * imgH], globalMaxZoom);
        const ne = map!.unproject([b.x2 * imgW, b.y1 * imgH], globalMaxZoom);
        return L.latLngBounds(sw, ne);
      }

      function boundsCenter(b: { x1: number; y1: number; x2: number; y2: number }) {
        const cx = ((b.x1 + b.x2) / 2) * imgW;
        const cy = ((b.y1 + b.y2) / 2) * imgH;
        return map!.unproject([cx, cy], globalMaxZoom);
      }

      // --- Level name labels layer ---
      const labelGroup = L.layerGroup();
      for (const level of levelsData.levels) {
        if (level.underground) continue;
        L.marker(boundsCenter(level.bounds), {
          icon: L.divIcon({
            className: 'map-level-label',
            html: `<span>${level.name}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
        }).addTo(labelGroup);
      }
      const labelLayer = layers.find(l => l.id === 'level-labels')!;
      labelLayer.group = labelGroup;
      if (labelLayer.visible) labelGroup.addTo(map);

      // Scale labels with zoom
      function updateLabelScale() {
        if (!map) return;
        const zoom = map.getZoom();
        const scale = Math.pow(2, zoom - 2) * 0.5;
        const clamped = Math.max(0.3, Math.min(scale, 1.4));
        mapContainer.value?.style.setProperty('--label-scale', String(clamped));
      }
      map.on('zoom', updateLabelScale);
      updateLabelScale();

      // --- Level boundaries layer ---
      const boundsGroup = L.layerGroup();
      for (const level of levelsData.levels) {
        if (level.underground) continue;
        L.rectangle(boundsToLatLng(level.bounds), {
          color: 'rgba(200, 168, 78, 0.7)',
          weight: 2,
          fillColor: 'var(--color-accent-tint-6)',
          fillOpacity: 1,
          interactive: false,
        }).addTo(boundsGroup);
      }
      const boundsLayer = layers.find(l => l.id === 'level-bounds')!;
      boundsLayer.group = boundsGroup;
      if (boundsLayer.visible) boundsGroup.addTo(map);

      // --- Entity marker layers ---
      const entitiesUrl = props.packId ? `/data/${props.packId}/map-entities.json` : '/data/map-entities.json';
      let entitiesData: any = null;
      try {
        const entitiesRes = await fetch(entitiesUrl);
        if (myId !== initMapId) return; // stale init
        if (entitiesRes.ok) {
          entitiesData = await entitiesRes.json();
        } else {
          console.warn(`No map entities for pack: ${props.packId}`);
        }
      } catch (e) {
        console.warn(`Failed to load map entities for pack: ${props.packId}`, e);
      }

      // Image dimensions for coordinate mapping (entities use 1024×2634 pixel space)
      const entImgW = entitiesData?.image?.width || 1024;
      const entImgH = entitiesData?.image?.height || 2634;

      // Canvas renderer — needed for both entity markers and save data anomaly markers
      const canvasRenderer = L.canvas({ padding: 0.5 });
      canvasRendererRef = canvasRenderer;

      // Guard against Leaflet crash when layers are removed during zoom animation
      for (const proto of [L.Marker.prototype, L.Renderer.prototype, L.CircleMarker.prototype]) {
        const orig = (proto as any)._animateZoom;
        if (orig) {
          (proto as any)._animateZoom = function (opt: any) {
            if (!this._map) return;
            orig.call(this, opt);
          };
        }
      }

      // Tracked markers — used by deconfliction and debug marker count
      interface TrackedMarker {
        marker: any; mapX: number; mapY: number; layerId: string;
        role?: string; name?: string; faction?: string; location?: string;
      }
      const trackedMarkers: TrackedMarker[] = [];

      if (entitiesData) {

      // Pretty-print level internal IDs
      const levelNames: Record<string, string> = {};
      for (const level of levelsData.levels) {
        levelNames[level.id] = level.name;
      }

      // Level-abbreviation prefixes used in entity names (level shown separately)
      const levelPrefixes = [
        'esc', 'mil', 'gar', 'agr', 'bar', 'yan', 'yantar', 'red', 'lim',
        'mar', 'trc', 'dark', 'val', 'pri', 'hos', 'jup', 'zat', 'pol',
        'kbo', 'mlr', 'depo', 'ros',
      ];
      const prefixRe = new RegExp(`^(${levelPrefixes.join('|')})_`);

      // Format raw entity names for display
      function displayName(ent: { name: string; type: string; level: string }) {
        if (ent.type === 'campfire') return 'Campfire';
        if (ent.type === 'level_changer') {
          const m = ent.name.match(/_to_(.+?)(?:_\d+)?$/);
          const fromName = levelNames[ent.level] || ent.level;
          if (m) {
            const destId = destToLevel[m[1]];
            const destName = destId ? (levelNames[destId] || destId) : m[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `To ${destName} from ${fromName}`;
          }
          return `Level Changer — ${fromName}`;
        }
        let n = ent.name;
        // "level_prefix_*" → strip entirely, just keep the suffix
        n = n.replace(/^level_prefix_/, '');
        // Strip level-abbreviation prefix (e.g. "esc_treasure_1" → "treasure_1")
        n = n.replace(prefixRe, '');
        // Strip common suffixes and internal identifiers
        n = n.replace(/_?inventory_box/, '').replace(/_box$/, '');
        n = n.replace(/smart_terrain_\d+_\d+/, 'stash');
        // Clean up leading/trailing underscores
        n = n.replace(/^_+|_+$/g, '');
        // Fallback if empty
        if (!n) n = ent.type;
        // Underscores → spaces, title case
        n = n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        // "Treasure N" → "Stash N"; bare numbers → "Stash #N"
        n = n.replace(/^Treasure\b/, 'Stash');
        if (/^\d+$/.test(n)) n = `Stash #${n}`;
        // Grid smart terrains ("Smart Terrain 4 9") → just "Smart Terrain"
        n = n.replace(/^Smart Terrain \d+ \d+$/, 'Smart Terrain');
        // Strip "Smart " prefix from descriptive names ("Smart Monolith Stalker2" → "Monolith Stalker 2")
        n = n.replace(/^Smart /, '');
        return n;
      }

      // Level changer destination name → level ID mapping
      const destToLevel: Record<string, string> = {
        escape: 'l01_escape', garbage: 'l02_garbage', agroprom: 'l03_agroprom',
        darkvalley: 'l04_darkvalley', val: 'l04_darkvalley', bar: 'l05_bar',
        rostok: 'l06_rostok', military: 'l07_military', yantar: 'l08_yantar',
        yantar_tunnel: 'l08_yantar', dead_city: 'l09_deadcity',
        limansk: 'l10_limansk', radar: 'l10_radar', red: 'l10_red_forest',
        red_forest: 'l10_red_forest', hospital: 'l11_hospital',
        pri: 'l11_pripyat', cop_pripyat: 'pripyat', soc_pripyat: 'pripyat',
        pripyat: 'pripyat', stancia: 'l12_stancia', aes: 'l12_stancia',
        aes1: 'l12_stancia', stancia2: 'l12_stancia_2', aes2: 'l12_stancia_2',
        gen: 'l13_generators', jupiter: 'jupiter', zaton: 'zaton',
        marsh: 'k00_marsh', darkscape: 'k01_darkscape', tc: 'k02_trucks_cemetery',
        pole: 'y04_pole',
        underground: 'l03u_agr_underground', labx18: 'l04u_labx18',
        x16: 'l08u_brainlab', bunker: 'l10u_bunker',
        control_monolith: 'l12u_control_monolith', sarcofag: 'l12u_sarcofag',
        warlab: 'l13u_warlab', jup_und: 'jupiter_underground',
        jupiter_ug_level_changer: 'jupiter_underground',
        red_forest_level_changer: 'l10_red_forest',
      };

      // Compute center pixel coords per level from globalRects in generate script
      // (reusing the same rects hardcoded there)
      // Level centers in 1024×2634 image pixel space (from global_rect midpoints).
      // Underground levels map to their surface parent for direction purposes.
      const levelCenters: Record<string, { x: number; y: number }> = {
        jupiter:              { x: 368, y: 874 },
        k00_marsh:            { x: 187, y: 2278 },
        k01_darkscape:        { x: 861, y: 2232 },
        k02_trucks_cemetery:  { x: 866, y: 1543 },
        l01_escape:           { x: 461, y: 2228 },
        l02_garbage:          { x: 471, y: 1878 },
        l03_agroprom:         { x: 248, y: 1932 },
        l04_darkvalley:       { x: 790, y: 1829 },
        l05_bar:              { x: 482, y: 1563 },
        l06_rostok:           { x: 333, y: 1563 },
        l07_military:         { x: 508, y: 1314 },
        l08_yantar:           { x: 175, y: 1646 },
        l09_deadcity:         { x: 121, y: 1351 },
        l10_limansk:          { x: 124, y: 990 },
        l10_radar:            { x: 648, y: 1097 },
        l10_red_forest:       { x: 289, y: 1119 },
        l11_hospital:         { x: 220, y: 746 },
        l11_pripyat:          { x: 674, y: 836 },
        l12_stancia:          { x: 525, y: 397 },
        l12_stancia_2:        { x: 525, y: 200 },
        l13_generators:       { x: 305, y: 70 },
        pripyat:              { x: 784, y: 823 },
        zaton:                { x: 382, y: 665 },
        y04_pole:             { x: 578, y: 2085 },
        // Underground → surface parent
        l03u_agr_underground: { x: 248, y: 1932 },
        l04u_labx18:          { x: 790, y: 1829 },
        l08u_brainlab:        { x: 175, y: 1646 },
        l10u_bunker:          { x: 648, y: 1097 },
        l12u_control_monolith:{ x: 525, y: 397 },
        l12u_sarcofag:        { x: 525, y: 397 },
        l13u_warlab:          { x: 305, y: 70 },
        jupiter_underground:  { x: 368, y: 874 },
        labx8:                { x: 674, y: 836 },
      };

      function getLevelChangerAngle(ent: { name: string; level: string; mapX: number; mapY: number }): number {
        const m = ent.name.match(/_to_(.+?)(?:_\d+)?$/);
        if (!m) return 0;
        const destLevel = destToLevel[m[1]];
        const destCenter = destLevel ? levelCenters[destLevel] : null;
        if (!destCenter) return 0;
        const dx = destCenter.x - ent.mapX;
        const dy = destCenter.y - ent.mapY;
        // SVG default points DOWN = 90° from +X in screen space (Y-down).
        // CSS rotation = target_angle - base_angle
        return Math.atan2(dy, dx) * (180 / Math.PI) - 90;
      }

      // Canvas image marker: draws preloaded images on the shared canvas
      L.Canvas.include({
        _updateCanvasImg(layer: any) {
          const ctx = this._ctx;
          if (!ctx) return;
          if (layer.options._hidden) return;
          const p = layer._point;
          const img = layer.options.canvasImg as HTMLImageElement;
          const s = layer.options.imgSize || 16;
          const rot = layer.options.rotation || 0;
          if (!img || !img.complete) return;
          ctx.save();
          ctx.translate(p.x, p.y);
          if (rot) ctx.rotate(rot * Math.PI / 180);
          ctx.drawImage(img, -s / 2, -s / 2, s, s);
          ctx.restore();
        },
      });

      // Canvas pie marker: draws colored segments directly on the canvas
      L.Canvas.include({
        _updateCanvasPie(layer: any) {
          const ctx = this._ctx;
          if (!ctx) return;
          if (layer.options._hidden) return;
          const p = layer._point;
          const r = layer.options.pieRadius || 8;
          const colors: string[] = layer.options.pieColors || [];
          if (!colors.length) return;
          const sliceAngle = (Math.PI * 2) / colors.length;
          ctx.save();
          ctx.globalAlpha = layer.options.pieOpacity ?? 0.35;
          for (let i = 0; i < colors.length; i++) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, r, i * sliceAngle - Math.PI / 2, (i + 1) * sliceAngle - Math.PI / 2);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
          }
          // Outline
          ctx.globalAlpha = layer.options.pieStrokeOpacity ?? 0.9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        },
      });

      const CanvasPieMarker = L.CircleMarker.extend({
        options: { pieRadius: 8, pieColors: [], pieOpacity: 0.5, pieStrokeOpacity: 0.9 },
        _updatePath() {
          (this._renderer as any)._updateCanvasPie(this);
        },
        _containsPoint(p: any) {
          if (this.options._hidden) return false;
          return p.distanceTo(this._point) <= (this.options.pieRadius || 8);
        },
      });

      function canvasPieMarker(latlng: L.LatLng, opts: any) {
        return new (CanvasPieMarker as any)(latlng, { ...opts, renderer: canvasRenderer });
      }

      const CanvasImgMarker = L.CircleMarker.extend({
        options: { canvasImg: null, imgSize: 16, rotation: 0 },
        _updatePath() {
          (this._renderer as any)._updateCanvasImg(this);
        },
        _containsPoint(p: any) {
          if (this.options._hidden) return false;
          const s = this.options.imgSize / 2;
          return p.distanceTo(this._point) <= s;
        },
      });

      function canvasImgMarker(latlng: L.LatLng, opts: any) {
        return new (CanvasImgMarker as any)(latlng, { ...opts, renderer: canvasRenderer });
      }

      // Preload icon images
      const iconImages: Record<string, HTMLImageElement> = {};
      function preloadIcon(name: string, src: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { iconImages[name] = img; resolve(img); };
          img.onerror = () => resolve(img);
          img.src = src;
        });
      }

      await Promise.all([
        preloadIcon('campfire', '/img/map/campfire.svg'),
        preloadIcon('level_changer', '/img/map/level_changer.svg'),
      ]);

      // Inline SVG → canvas image helper for colored markers
      function svgToImg(svgStr: string): HTMLImageElement {
        const img = new Image();
        img.src = 'data:image/svg+xml,' + encodeURIComponent(svgStr);
        return img;
      }

      // Dark orange campfire icon for canvas rendering
      iconImages['campfire_orange'] = svgToImg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="M256 16c-52.5 252.632-210 277.845 0 454.688C466 293.845 308.5 268.63 256 16zM124.75 167.407C98.5 243.197 46 294.117 46 369.907S151 496 229.75 496c-157.5-126.317-105-202.278-105-328.593zm262.5 0c0 126.317 52.5 202.278-105 328.593C361 496 466 445.696 466 369.907c0-75.79-52.5-126.71-78.75-202.5z" fill="#e65100" stroke="rgba(0,0,0,0.6)" stroke-width="12" transform="translate(76.8,76.8) scale(0.7)"/></svg>`
      );

      // Pre-render NPC role icons (teardrop pin with cutout)
      const pinBody = `M184.277,0c-71.683,0-130,58.317-130,130c0,87.26,119.188,229.855,124.263,235.883c1.417,1.685,3.504,2.66,5.705,2.67c0.011,0,0.021,0,0.032,0c2.189,0,4.271-0.957,5.696-2.621c5.075-5.926,124.304-146.165,124.304-235.932C314.276,58.317,255.96,0,184.277,0z`;
      const npcIcons: Record<string, HTMLImageElement> = {};
      for (const [role, color] of Object.entries(npcRoleColors)) {
        if (role === 'trader') {
          // Trader: yellow pin with black T
          npcIcons[role] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 368" width="24" height="24"><path d="${pinBody}" fill="${color}" fill-opacity="0.85"/><path d="${pinBody}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="10"/><text x="184" y="128" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-weight="bold" font-size="220" fill="rgba(0,0,0,0.7)">₽</text></svg>`
          );
        } else if (role === 'mechanic') {
          // Mechanic: dark blue pin with white wrench
          npcIcons[role] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 368" width="24" height="24"><path d="${pinBody}" fill="${color}" fill-opacity="0.85"/><path d="${pinBody}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="10"/><g transform="translate(112,56) scale(5.5)"><path d="M21.94,4.76,18.12,8.58l-2-.68-.68-2,3.82-3.82a5.71,5.71,0,0,0-7.93,6.81L1.5,18.68,5.32,22.5l9.81-9.81a5.71,5.71,0,0,0,6.81-7.93Z" fill="white"/></g></svg>`
          );
        } else if (role === 'medic') {
          // Medic: solid red pin with white cross
          npcIcons[role] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 368" width="24" height="24"><path d="${pinBody}" fill="${color}" fill-opacity="0.85"/><path d="${pinBody}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="10"/><line x1="184" y1="48" x2="184" y2="208" stroke="white" stroke-width="44" stroke-linecap="butt"/><line x1="104" y1="128" x2="264" y2="128" stroke="white" stroke-width="44" stroke-linecap="butt"/></svg>`
          );
        } else {
          npcIcons[role] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 368 368" width="24" height="24"><defs><mask id="m${role}"><rect width="368" height="368" fill="white"/><circle cx="184.277" cy="127.562" r="40.269" fill="black"/></mask></defs><path d="${pinBody}" fill="${color}" fill-opacity="0.85" mask="url(#m${role})"/><path d="${pinBody}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="10"/><circle cx="184.277" cy="127.562" r="40.269" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="6"/></svg>`
          );
        }
      }

      // Pre-render faction territory icons
      const factionIcons: Record<string, HTMLImageElement> = {};
      for (const [fac, rgb] of Object.entries(factionTerritoryColors)) {
        const color = `rgb(${rgb.join(',')})`;
        if (fac === 'killer') {
          factionIcons[fac] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="9" fill="rgb(20,20,20)" fill-opacity="0.5" stroke="rgb(150,150,150)" stroke-width="1.5" stroke-opacity="0.8"/></svg>`
          );
        } else {
          factionIcons[fac] = svgToImg(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="9" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="1.5" stroke-opacity="0.8"/></svg>`
          );
        }
      }
      factionIcons['merc'] = factionIcons['killer'];
      const mutantIcon = svgToImg(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"><polygon points="10,2 18,18 2,18" fill="#d44" fill-opacity="0.15" stroke="#d44" stroke-width="1.5"/><circle cx="10" cy="13" r="1.5" fill="#d44"/></svg>`
      );

      // Deconfliction: reposition overlapping markers based on visible layers
      const stWithFactions = (entitiesData.entities.smart_terrain || []).filter((s: any) => s.factions?.length);
      // Create a low-z pane for connector lines so markers render on top
      map.createPane('connectors');
      map.getPane('connectors')!.style.zIndex = '350';
      map.getPane('connectors')!.style.pointerEvents = 'none';
      const connectorGroup = L.layerGroup().addTo(map);
      function trackMarker(marker: any, ent: any, layerId: string) {
        let name = ent.char_name || ent.label || (ent.location ? ent.location.replace(/^[^-]+ - /, '') : undefined);
        if (!name && ent.type) name = displayName(ent);
        trackedMarkers.push({
          marker, mapX: ent.mapX, mapY: ent.mapY, layerId,
          role: ent.role, name, faction: ent.faction,
          location: ent.location ? ent.location.replace(/^[^-]+ - /, '') : undefined,
        });
      }

      // --- Clustering: proximity-based badges with zoom-in or popup on click ---
      function hideMarker(tm: TrackedMarker) {
        if (tm.layerId === 'smart_terrain') {
          if (tm.marker._icon) tm.marker._icon.style.display = 'none';
        } else if (tm.marker.options?.canvasImg !== undefined) {
          tm.marker.options._hidden = true;
        } else if (tm.marker.setStyle) {
          tm.marker.setStyle({ opacity: 0, fillOpacity: 0 });
        }
        tm.marker.options.interactive = false;
        if (tm.marker._path) tm.marker._path.style.pointerEvents = 'none';
      }

      function showMarker(tm: TrackedMarker) {
        if (tm.layerId === 'smart_terrain') {
          if (tm.marker._icon) tm.marker._icon.style.display = '';
        } else if (tm.marker.options?.canvasImg !== undefined) {
          tm.marker.options._hidden = false;
        } else if (tm.marker.setStyle) {
          tm.marker.setStyle({ opacity: 0.8, fillOpacity: 0.6 });
        }
        tm.marker.options.interactive = true;
        if (tm.marker._path) tm.marker._path.style.pointerEvents = '';
      }

      const pinSvgPath = 'M184.277,0c-71.683,0-130,58.317-130,130c0,87.26,119.188,229.855,124.263,235.883c1.417,1.685,3.504,2.66,5.705,2.67c0.011,0,0.021,0,0.032,0c2.189,0,4.271-0.957,5.696-2.621c5.075-5.926,124.304-146.165,124.304-235.932C314.276,58.317,255.96,0,184.277,0z';

      function pinSvg(color: string): string {
        return `<span class="map-cluster-popup-icon-cell"><svg class="map-cluster-popup-pin" viewBox="0 0 368 368" width="18" height="24">`
          + `<path d="${pinSvgPath}" fill="${color}" fill-opacity="0.85" stroke="rgba(0,0,0,0.6)" stroke-width="10"/>`
          + `</svg></span>`;
      }

      function buildClusterPopupHtml(members: TrackedMarker[]): string {
        // Find a location name for the header
        const locMember = members.find(tm => tm.layerId === 'smart_terrain' && tm.location);
        const header = locMember ? `<div class="map-cluster-popup-header">${locMember.location}</div>` : '';

        // Consolidate campfires into a single count line
        const nonLabel = members.filter(tm => tm.layerId !== 'smart_terrain');
        const campfires = nonLabel.filter(tm => tm.layerId === 'campfire');
        const others = nonLabel.filter(tm => tm.layerId !== 'campfire');
        const campfireSvg = `<span class="map-cluster-popup-icon-cell"><svg class="map-cluster-popup-pin" viewBox="0 0 512 512" width="18" height="24">`
          + `<path d="M256 16c-52.5 252.632-210 277.845 0 454.688C466 293.845 308.5 268.63 256 16zM124.75 167.407C98.5 243.197 46 294.117 46 369.907S151 496 229.75 496c-157.5-126.317-105-202.278-105-328.593zm262.5 0c0 126.317 52.5 202.278-105 328.593C361 496 466 445.696 466 369.907c0-75.79-52.5-126.71-78.75-202.5z" fill="#e65100" stroke="rgba(0,0,0,0.6)" stroke-width="12" transform="translate(76.8,76.8) scale(0.7)"/>`
          + `</svg></span>`;
        const campfireLine = campfires.length > 0
          ? `<div class="map-cluster-popup-item">`
            + campfireSvg
            + `<div class="map-cluster-popup-info">`
            + `<span class="map-cluster-popup-name">Campfire${campfires.length > 1 ? 's' : ''}</span>`
            + (campfires.length > 1 ? `<span class="map-cluster-popup-meta">×${campfires.length}</span>` : '')
            + `</div></div>`
          : '';

        const items = others
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map(tm => {
            const color = (tm.role && npcRoleColors[tm.role]) ? npcRoleColors[tm.role] : (entityLayerDefs.find(d => d.id === tm.layerId)?.color || '#aaa');
            const icon = pinSvg(color);
            const name = tm.name || tm.role || tm.layerId;

            if (tm.layerId === 'named_npc') {
              const role = tm.role ? tm.role.charAt(0).toUpperCase() + tm.role.slice(1) : '';
              const facImg = tm.faction ? factionIcon(tm.faction) : '';
              const meta = role;
              return `<div class="map-cluster-popup-item">`
                + `${icon}`
                + `<div class="map-cluster-popup-info">`
                + `<span class="map-cluster-popup-name">${name}</span>`
                + (meta ? `<span class="map-cluster-popup-meta">${meta}</span>` : '')
                + `</div>`
                + (facImg ? `<img src="/img/${facImg}" class="map-cluster-popup-fac">` : '')
                + `</div>`;
            }

            if (tm.layerId === 'level_changer') {
              const lcMatch = name.match(/^To (.+?) from (.+)$/);
              const toLine = lcMatch ? lcMatch[1] : name;
              const fromLine = lcMatch ? lcMatch[2] : '';
              return `<div class="map-cluster-popup-item">`
                + `<span class="map-cluster-popup-icon-cell"><img src="/img/map/level_changer.svg" class="map-cluster-popup-lcicon"></span>`
                + `<div class="map-cluster-popup-info">`
                + `<span class="map-cluster-popup-name">${toLine}</span>`
                + (fromLine ? `<span class="map-cluster-popup-meta">From ${fromLine}</span>` : '')
                + `</div></div>`;
            }

            const layerDef = entityLayerDefs.find(d => d.id === tm.layerId);
            const typeLabel = layerDef ? layerDef.label.replace(/s$/, '') : tm.layerId;
            return `<div class="map-cluster-popup-item">`
              + `${icon}`
              + `<div class="map-cluster-popup-info">`
              + `<span class="map-cluster-popup-name">${name}</span>`
              + `<span class="map-cluster-popup-meta">${typeLabel}</span>`
              + `</div></div>`;
          }).join('');

        return `<div class="map-cluster-popup">${header}${items}${campfireLine}</div>`;
      }

      relayoutMarkers = function relayoutMarkersImpl() {
        if (!map) return;
        try { map!.getCenter(); } catch { return; }
        if ((map as any)._animatingZoom || (map as any)._zooming) return;
        try { map.closePopup(); } catch {}
        try { connectorGroup.clearLayers(); } catch {}

        const zoom = map!.getZoom();
        const visibleIds = new Set(
          layers.filter(l => {
            if (!l.visible) return false;
            const def = entityLayerDefs.find(d => d.id === l.id);
            if (def && zoom < def.minZoom) return false;
            return true;
          }).map(l => l.id)
        );
        if (layers.find(l => l.id === 'faction-territory')?.visible) visibleIds.add('faction-territory');

        // Viewport culling
        const mapSize = map!.getSize();
        const margin = 120;
        const vpLeft = -margin, vpTop = -margin;
        const vpRight = mapSize.x + margin, vpBottom = mapSize.y + margin;

        // Collect visible markers with screen positions
        interface VisibleMarker {
          tm: TrackedMarker;
          trueX: number; trueY: number;
          globalPx: [number, number];
        }
        const visible: VisibleMarker[] = [];
        for (const tm of trackedMarkers) {
          if (!visibleIds.has(tm.layerId)) continue;
          // Skip faction territory (heatmap layer) and campfires (deduped separately) from clustering
          if (tm.layerId === 'faction-territory' || tm.layerId === 'campfire') continue;
          const globalPx: [number, number] = [tm.mapX / entImgW * imgW, tm.mapY / entImgH * imgH];
          const screenPt = map!.latLngToContainerPoint(map!.unproject(globalPx, globalMaxZoom));
          if (screenPt.x < vpLeft || screenPt.x > vpRight || screenPt.y < vpTop || screenPt.y > vpBottom) {
            tm.marker.setLatLng(map!.unproject(globalPx, globalMaxZoom));
            showMarker(tm);
            continue;
          }
          visible.push({ tm, trueX: screenPt.x, trueY: screenPt.y, globalPx });
        }

        // Proximity-based clustering in screen-pixel space
        const clusterRadius = 40;
        const autoExpandZoom = 8; // above this, only cluster exact same-position markers

        interface Cluster { cx: number; cy: number; members: VisibleMarker[] }
        const clusters: Cluster[] = [];
        const assigned = new Set<VisibleMarker>();

        // Deduplicate campfires at same position — show one per spot at all zoom levels
        const campfireSeen = new Set<string>();
        for (const vm of visible) {
          if (vm.tm.layerId === 'campfire') {
            const key = `${Math.round(vm.tm.mapX)},${Math.round(vm.tm.mapY)}`;
            if (campfireSeen.has(key)) {
              hideMarker(vm.tm);
              assigned.add(vm);
            } else {
              campfireSeen.add(key);
            }
          }
        }

        if (zoom < autoExpandZoom) {
          // Greedy proximity clustering
          for (const vm of visible) {
            if (assigned.has(vm)) continue;
            let bestCluster: Cluster | null = null;
            let bestDist = clusterRadius;
            for (const c of clusters) {
              const d = Math.sqrt((vm.trueX - c.cx) ** 2 + (vm.trueY - c.cy) ** 2);
              if (d < bestDist) { bestDist = d; bestCluster = c; }
            }
            if (bestCluster) {
              bestCluster.members.push(vm);
              assigned.add(vm);
              const n = bestCluster.members.length;
              bestCluster.cx = bestCluster.members.reduce((s, m) => s + m.trueX, 0) / n;
              bestCluster.cy = bestCluster.members.reduce((s, m) => s + m.trueY, 0) / n;
            } else {
              clusters.push({ cx: vm.trueX, cy: vm.trueY, members: [vm] });
              assigned.add(vm);
            }
          }
        } else {
          // Exact same-position grouping only
          const exactGroups = new Map<string, Cluster>();
          for (const vm of visible) {
            if (assigned.has(vm)) continue;
            const key = `${Math.round(vm.tm.mapX)},${Math.round(vm.tm.mapY)}`;
            const existing = exactGroups.get(key);
            if (existing) {
              existing.members.push(vm);
              const n = existing.members.length;
              existing.cx = existing.members.reduce((s, m) => s + m.trueX, 0) / n;
              existing.cy = existing.members.reduce((s, m) => s + m.trueY, 0) / n;
            } else {
              exactGroups.set(key, { cx: vm.trueX, cy: vm.trueY, members: [vm] });
            }
          }
          for (const c of exactGroups.values()) clusters.push(c);
        }

        // Place markers: solo → show directly, cluster → show badge
        for (const cluster of clusters) {
          const nonLabelMembers = cluster.members.filter(vm => vm.tm.layerId !== 'smart_terrain');
          const labelMembers = cluster.members.filter(vm => vm.tm.layerId === 'smart_terrain');

          if (nonLabelMembers.length < 2) {
            // Not enough non-label markers to cluster — show everything individually
            for (const vm of cluster.members) {
              vm.tm.marker.setLatLng(map!.unproject(vm.globalPx, globalMaxZoom));
              showMarker(vm.tm);
            }
          } else {
            // Cluster — hide all members (including labels), show badge with non-label count
            for (const vm of cluster.members) hideMarker(vm.tm);
            const badgeLatLng = map!.containerPointToLatLng(L.point(cluster.cx, cluster.cy));
            const badge = L.marker(badgeLatLng, {
              icon: L.divIcon({
                className: 'map-cluster-badge',
                html: `<span>${nonLabelMembers.length}</span>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
              interactive: true,
              zIndexOffset: 1000,
            });
            const clusterMembers = cluster.members;
            const clusterCenter = badgeLatLng;
            badge.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              if (!map || (map as any)._animatingZoom) return;
              map.closePopup();
              const html = buildClusterPopupHtml(clusterMembers.map(vm => vm.tm));
              L.popup({ className: 'map-cluster-popup-wrap', maxHeight: 250, maxWidth: 450, minWidth: 180, closeButton: false })
                .setLatLng(clusterCenter)
                .setContent(html)
                .openOn(map);
            });
            badge.addTo(connectorGroup);
          }
        }

        // Force canvas to repaint so hidden markers disappear
        try { (canvasRenderer as any)._redraw(); } catch {}
      }

      function npcIconSize() {
        const z = map?.getZoom() || 4;
        if (z >= 7) return 34 + (z - 7) * 6;
        if (z >= 6) return 28;
        return 28;
      }

      // Update NPC marker sizes on zoom change
      updateNpcIconsFn = function updateNpcIcons() {
        const size = npcIconSize();
        for (const tm of trackedMarkers) {
          if (tm.layerId !== 'named_npc' && tm.layerId !== 'campfire') continue;
          tm.marker.options.imgSize = size;
          tm.marker.redraw();
        }
      }

      // Initial placement helper — places at center, relayout fixes later
      function initialPoint(ent: { mapX: number; mapY: number }): L.LatLng {
        return map!.unproject([ent.mapX / entImgW * imgW, ent.mapY / entImgH * imgH], globalMaxZoom);
      }

      for (const def of entityLayerDefs) {
        const ents = entitiesData.entities[def.id];
        if (!ents) continue;

        const dotGroup = L.layerGroup();

        for (const ent of ents) {
          const pt = initialPoint(ent);
          const title = ent.char_name || ent.label || displayName(ent);

          function buildDebugInfo() {
            if (!debugMode.value) return '';
            const fields = [
              `name: ${ent.name}`,
              `section: ${ent.section || '—'}`,
              `type: ${ent.type}`,
              `level: ${ent.level}`,
              `mapX: ${ent.mapX} · mapY: ${ent.mapY}`,
            ];
            if (ent.id) fields.push(`id: ${ent.id}`);
            if (ent.role) fields.push(`role: ${ent.role}`);
            if (ent.faction) fields.push(`faction: ${ent.faction}`);
            if (ent.label_key) fields.push(`label_key: ${ent.label_key}`);
            if (ent.location) fields.push(`location: ${ent.location}`);
            return `<div class="map-debug-info">${fields.join('<br>')}</div>`;
          }

          let baseContent: string;
          if (ent.type === 'level_changer') {
            const m = ent.name.match(/_to_(.+?)(?:_\d+)?$/);
            const fromName = levelNames[ent.level] || ent.level;
            const destId = m ? destToLevel[m[1]] : null;
            const destName = destId ? (levelNames[destId] || destId) : '';
            baseContent = destName
              ? `<span class="map-npc-tip-meta">To</span> <b>${destName}</b> <span class="map-npc-tip-meta">from</span> <b>${fromName}</b>`
              : `<b>${title}</b>`;
          } else if (ent.faction) {
            const fIcon = factionIcon(ent.faction);
            const facDisplay = factionName(ent.faction);
            const roleName = ent.role ? ent.role.charAt(0).toUpperCase() + ent.role.slice(1) : '';
            const locName = ent.location || levelNames[ent.level] || ent.level;
            const meta = [roleName, roleName.toLowerCase() !== facDisplay.toLowerCase() ? facDisplay : '', locName].filter(Boolean).join(' · ');
            baseContent = `<div class="map-npc-tip">`
              + `<img src="/img/${fIcon}" class="map-npc-tip-icon">`
              + `<div><b>${title}</b><br><span class="map-npc-tip-meta">${meta}</span></div>`
              + `</div>`;
          } else {
            const levelName = levelNames[ent.level] || ent.level;
            baseContent = `<b>${title}</b><br><span class="map-npc-tip-meta">${levelName}</span>`;
          }
          const tooltipFn = () => baseContent + buildDebugInfo();
          const markerColor = ent.role ? (npcRoleColors[ent.role] || def.color) : def.color;

          if (def.id === 'smart_terrain') {
            if (!ent.location) continue;
            const shortName = ent.location.replace(/^[^-]+ - /, '');
            const locLC = shortName.toLowerCase();
            const category =
              /bonfire|campfire|fire near/.test(locLC) ? 'Campfire' :
              /camp|outpost|hideout|hiding|tent|lookout|vantage|rally|post|picnic|encampment|barricade|sandbag/.test(locLC) ? 'Camp' :
              /lair|den|nest|territory/.test(locLC) ? 'Mutant Lair' :
              /checkpoint|barrier|blockade|entrance|passage|crossing|tunnel|bridge/.test(locLC) ? 'Passage' :
              /anomal|radioactive|burnt fuzz|burning|scorcher|iron forest/.test(locLC) ? 'Anomaly Field' :
              /factory|station|warehouse|building|store|school|hotel|hospital|apartment|theater|kindergarten|laundromat|depot|complex|bunker|substation|shed|monoblock/.test(locLC) ? 'Structure' :
              'Landmark';
            const levelName = levelNames[ent.level] || ent.level;
            const locTip = () => `<b>${shortName}</b><br><span class="map-npc-tip-meta">${category} · ${levelName}</span>` + buildDebugInfo();
            const locMarker = L.marker(pt, {
              icon: L.divIcon({
                className: 'map-location-label',
                html: `<span>${shortName}</span>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              }),
            });
            locMarker.addTo(dotGroup);
            bindMapTooltip(locMarker, locTip);
            trackMarker(locMarker, ent, def.id);
          } else if (def.id === 'named_npc') {
            const role = ent.role || 'npc';
            const m = canvasImgMarker(pt, {
              canvasImg: npcIcons[role] || npcIcons['npc'],
              imgSize: npcIconSize(),
            }).addTo(dotGroup);
            bindMapTooltip(m, tooltipFn);
            trackMarker(m, ent, def.id);
          } else if (def.id === 'campfire') {
            const m = canvasImgMarker(pt, {
              canvasImg: iconImages['campfire_orange'],
              imgSize: npcIconSize(),
            }).addTo(dotGroup);
            bindMapTooltip(m, tooltipFn);
            trackMarker(m, ent, def.id);
          } else if (def.id === 'level_changer') {
            const angle = getLevelChangerAngle(ent);
            const m = canvasImgMarker(pt, {
              canvasImg: iconImages['level_changer'],
              imgSize: 20,
              rotation: angle,
            }).addTo(dotGroup);
            bindMapTooltip(m, tooltipFn);
            trackMarker(m, ent, def.id);
          } else {
            const m = L.circleMarker(pt, {
              radius: Math.max(def.radius, 6),
              color: markerColor,
              fillColor: markerColor,
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.8,
              renderer: canvasRenderer,
            }).addTo(dotGroup);
            bindMapTooltip(m, tooltipFn);
            trackMarker(m, ent, def.id);
          }
        }

        const layer = layers.find(l => l.id === def.id)!;
        layer.group = dotGroup;
        if (layer.visible) dotGroup.addTo(map);
      }

      // Build search index from loaded entities
      const searchItems: SearchItem[] = [];
      // Add levels as searchable
      for (const level of levelsData.levels) {
        if (level.underground) continue;
        searchItems.push({
          key: `level-${level.id}`,
          title: level.name,
          typeLabel: 'Level',
          color: 'var(--color-accent)',
          levelName: '',
          latlng: boundsCenter(level.bounds),
          layerId: 'level-labels',
        });
      }
      // Add entities
      for (const def of entityLayerDefs) {
        const ents = entitiesData.entities[def.id];
        if (!ents) continue;
        for (const ent of ents) {
          if (def.id === 'campfire') continue; // too many, not useful to search
          if (def.id === 'smart_terrain' && !ent.location) continue;
          const title = def.id === 'smart_terrain'
            ? ent.location.replace(/^[^-]+ - /, '')
            : (ent.char_name || ent.label || displayName(ent));
          if (!title || title === 'Campfire') continue;
          const levelName = levelNames[ent.level] || ent.level;
          const pt = map!.unproject([ent.mapX / entImgW * imgW, ent.mapY / entImgH * imgH], globalMaxZoom);
          const tm = trackedMarkers.find(m => m.mapX === ent.mapX && m.mapY === ent.mapY && m.layerId === def.id);
          const role = ent.role ? ent.role.charAt(0).toUpperCase() + ent.role.slice(1) : '';
          searchItems.push({
            key: `${def.id}-${ent.name}-${ent.mapX}-${ent.mapY}`,
            title,
            typeLabel: role || def.label.replace(/s$/, ''),
            color: ent.role ? (npcRoleColors[ent.role] || def.color) : def.color,
            levelName,
            latlng: tm ? tm.marker.getLatLng() : pt,
            layerId: def.id,
            marker: tm?.marker,
          });
        }
      }
      allSearchItems.value = searchItems;

      const ANOMALY_MIN_ZOOM = 4;
      function updateEntityVisibility() {
        if (!map) return;
        const zoom = map.getZoom();
        for (const def of entityLayerDefs) {
          const layer = layers.find(l => l.id === def.id)!;
          if (!layer.group) continue;          if (layer.visible && zoom >= def.minZoom) {
            if (!map.hasLayer(layer.group)) layer.group.addTo(map);
          } else if (map.hasLayer(layer.group)) {
            layer.group.removeFrom(map);
          }
        }
        // Anomaly layer zoom gating
        if (anomalyMarkerGroup) {
          if (anomalyLayerVisible.value && zoom >= ANOMALY_MIN_ZOOM) {
            if (!map.hasLayer(anomalyMarkerGroup)) anomalyMarkerGroup.addTo(map);
          } else if (map.hasLayer(anomalyMarkerGroup)) {
            anomalyMarkerGroup.removeFrom(map);
          }
        }
        if (relayoutMarkers) relayoutMarkers();
        if (updateNpcIconsFn) updateNpcIconsFn();
      }
      map.on('zoomend', updateEntityVisibility);
      // Re-run deconfliction on pan (screen-pixel positions change)
      map.on('moveend', () => { if (relayoutMarkers) relayoutMarkers(); });
      updateEntityVisibility();

      // --- Faction territory markers ---
      const factionTerritoryGroup = L.layerGroup();
      // stWithFactions already declared in pre-count section above

      for (const st of stWithFactions) {
        const shortLoc = (st.location || st.name).replace(/^[^-]+ - /, '');
        const isMutant = st.isMutant;
        const mutantLabel = st.mutants ? st.mutants.slice(0, 4).join(', ') : '';
        const pt = initialPoint(st);

        let tipHtml: string;
        let pieColors: string[];

        if (isMutant) {
          tipHtml = `<b>${shortLoc}</b><br><span class="map-npc-tip-meta">Mutant Zone · ${mutantLabel}</span>`;
          pieColors = ['#dd4444'];
        } else {
          const facRows = st.factions.map((f: string) =>
            `<div class="map-faction-tip-row"><img src="/img/${factionIcon(f)}" class="map-faction-tip-icon"><span>${factionName(f)}</span></div>`
          ).join('');
          tipHtml = `<b>${shortLoc}</b><div class="map-faction-tip-list">${facRows}</div>`;
          pieColors = st.factions.map((f: string) => {
            const rgb = factionTerritoryColors[f] || factionTerritoryColors['killer'];
            return rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : 'rgb(150,150,150)';
          });
        }

        const tipFn = () => tipHtml + (debugMode.value
          ? `<div class="map-debug-info">name: ${st.name}<br>factions: ${(st.factions||[]).join(',')}<br>mutants: ${(st.mutants||[]).join(',')}<br>mapX: ${st.mapX} · mapY: ${st.mapY}</div>`
          : '');

        const fm = canvasPieMarker(pt, {
          pieRadius: 9,
          pieColors,
        }).addTo(factionTerritoryGroup);
        bindMapTooltip(fm, tipFn);
        trackMarker(fm, st, 'faction-territory');
      }

      const ftLayer = layers.find(l => l.id === 'faction-territory')!;
      ftLayer.group = factionTerritoryGroup;
      if (ftLayer.visible) factionTerritoryGroup.addTo(map);

      // Initial layout based on visible layers
      relayoutMarkers();
      } // end if (entitiesData)

      // Debug: cursor tracking + marker count
      tileSource.value = localTiles.value ? 'Local' : 'CDN';
      function updateDebugMarkerCount() {
        const zoom = map!.getZoom();
        let visible = 0;
        for (const def of entityLayerDefs) {
          const layer = layers.find(l => l.id === def.id);
          if (layer?.visible && zoom >= def.minZoom) {
            visible += trackedMarkers.filter(tm => tm.layerId === def.id).length;
          }
        }
        debugMarkerCount.value = `${visible} markers visible`;
      }
      map.on('zoomend', updateDebugMarkerCount);
      updateDebugMarkerCount();

      map.on('mousemove', (e: any) => {
        if (!debugMode.value) return;
        const pt = map!.project(e.latlng, globalMaxZoom);
        const ltxX = (pt.x / imgW * 1024).toFixed(0);
        const ltxY = (pt.y / imgH * 2634).toFixed(0);
        const entX = (pt.x / imgW * entImgW).toFixed(0);
        const entY = (pt.y / imgH * entImgH).toFixed(0);
        // Find which level the cursor is over
        let levelName = '—';
        for (const level of levelsData.levels) {
          if (level.underground) continue;
          const b = level.bounds;
          const nx = pt.x / imgW, ny = pt.y / imgH;
          if (nx >= b.x1 && nx <= b.x2 && ny >= b.y1 && ny <= b.y2) {
            levelName = level.name;
            break;
          }
        }
        debugCursorInfo.value = `LTX ${ltxX},${ltxY} · Ent ${entX},${entY} · ${levelName}`;
      });

      // Save position on move/zoom (debounced)
      let saveTimer: ReturnType<typeof setTimeout> | null = null;
      function savePosition() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          if (!map) return;
          try {
            const c = map.getCenter();
            localStorage.setItem(MAP_POS_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
          } catch {}
        }, 500);
      }
      map.on('moveend zoomend', savePosition);

      // Restore save data from localStorage
      try {
        const savedPlayer = localStorage.getItem(PLAYER_POS_KEY);
        if (savedPlayer) {
          const pos = JSON.parse(savedPlayer);
          if (pos?.mapX != null && pos?.mapY != null && pos?.levelId) {
            playerPosition.value = pos;
            if (playerLayerVisible.value) placePlayerMarker(pos);
          }
        }
        const savedData = localStorage.getItem(SAVE_DATA_KEY);
        if (savedData) {
          saveMapData.value = JSON.parse(savedData);
          if (stashLayerVisible.value && saveMapData.value?.stashPositions.length) {
            placeStashMarkers(saveMapData.value.stashPositions);
          }
          if (anomalyLayerVisible.value && saveMapData.value?.anomalies.length) {
            placeAnomalyMarkers(saveMapData.value.anomalies);
          }
        }
      } catch {}

      setTimeout(() => map?.invalidateSize(), 100);
    }

    function destroyMap() {
      removePlayerMarker();
      removeStashMarkers();
      removeAnomalyMarkers();
      if (highlightMarker && map) map.removeLayer(highlightMarker);
      highlightMarker = null;
      relayoutMarkers = null;
      updateNpcIconsFn = null;
      canvasRendererRef = null;
      allSearchItems.value = [];
      // Clear all layer group references (they belong to the old map instance)
      for (const layer of layers) layer.group = null;
      if (map) {
        map.remove();
        map = null;
      }
      // Clear any stale DOM left by Leaflet
      if (mapContainer.value) mapContainer.value.innerHTML = '';
    }

    function rebuildLayers(packId: string) {
      // Rebuild entity layer defs and layers array for new pack
      entityLayerDefs = buildEntityLayerDefs(packId);
      const savedState = loadState();
      const savedVis = savedState?.visibleLayers;
      // Remove old entity layers, keep base layers
      const baseIds = new Set(['level-labels', 'level-bounds', 'faction-territory']);
      for (let i = layers.length - 1; i >= 0; i--) {
        if (!baseIds.has(layers[i].id)) layers.splice(i, 1);
      }
      // Add new entity layers
      for (const d of entityLayerDefs) {
        layers.push({
          id: d.id, label: d.label,
          visible: savedVis ? savedVis.includes(d.id) : d.id === 'stash',
          group: null,
        });
      }
    }

    onMounted(() => {
      initMap();
    });

    onBeforeUnmount(() => {
      destroyMap();
    });

    // Re-initialize map when pack changes
    watch(() => props.packId, (newPack) => {
      destroyMap();
      rebuildLayers(newPack);
      initMap();
    });

    // When the view becomes visible again (v-show toggled), fix Leaflet layout
    watch(() => props.visible, (val) => {
      if (val && map) {
        // Use a small delay to ensure display:none has been removed from the DOM
        setTimeout(() => { map?.invalidateSize(); }, 50);
      }
    });

    const baseLayerIds = new Set(['level-labels', 'level-bounds', 'faction-territory']);
    const baseLayers = computed(() => layers.filter(l => baseLayerIds.has(l.id) && l.group));
    const entityLayers = computed(() => layers.filter(l => !baseLayerIds.has(l.id) && l.group));

    function entityColor(id: string) {
      return entityLayerDefs.find(d => d.id === id)?.color || 'var(--color-white)';
    }

    return {
      mapContainer,
      currentZoom,
      tileStatus,
      tileSource,
      debugCursorInfo,
      debugMarkerCount,
      mapTooltip,
      mapTooltipArrow,
      tooltipVisible,
      tooltipHtml,
      panelOpen,
      debugMode,
      localTiles,
      layers,
      baseLayers,
      entityLayers,
      toggleLayer,
      entityColor,
      npcRoleColors,
      factionTerritoryColors,
      factionName,
      saveState,
      searchInput,
      searchResultsEl,
      searchOpen,
      searchQuery,
      searchActiveIdx,
      searchResults,
      searchMove,
      searchConfirm,
      searchSelect,
      closeSearch,
      onViewClick,
      infoTooltip,
      infoTooltipArrow,
      infoTooltipVisible,
      infoTooltipText,
      showInfoTooltip,
      hideInfoTooltip,
      playerPosition,
      playerLayerVisible,
      stashLayerVisible,
      anomalyLayerVisible,
      saveMapData,
      playerLevelName,
      playerImportError,
      savePanelOpen,
      saveDragOver,
      globalDragOver,
      flyToPlayer,
      clearPlayer,
      togglePlayerLayer,
      toggleStashLayer,
      toggleAnomalyLayer,
      onScopImport,
      onScopDrop,
      onGlobalDrop,
      onViewDragEnter,
      onViewDragLeave,
    };
  },
});
</script>

<style scoped>
.maps-view {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  z-index: 0;
}

.maps-banner {
  position: absolute;
  bottom: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: var(--color-overlay-black-70);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .maps-banner-text {
    display: none;
  }
  .maps-banner-link:first-of-type {
    border-left: none;
    margin-left: 0;
    padding-left: 0;
  }
}

.maps-banner-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(200, 168, 78, 0.25);
  color: var(--accent);
  text-decoration: none;
}

.maps-banner-link:hover {
  text-decoration: underline;
}

.map-debug-overlay {
  position: absolute;
  bottom: 0.6rem;
  right: 0.6rem;
  z-index: 1000;
  padding: 0.3rem 0.6rem;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-family: monospace;
  border-radius: 6px;
  pointer-events: none;
  line-height: 1.5;
  white-space: nowrap;
}

.map-container {
  position: absolute;
  inset: 0;
  background: var(--color-black);
}

/* --- Controls column (layer panel + save button) --- */
.map-controls-col {
  position: absolute;
  top: 6rem;
  left: 0.6rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}

/* --- Overlay control panel --- */
.map-overlay-panel {
  display: flex;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-radius: 6px;
  font-size: 0.8rem;
  transition: width 0.15s ease;
}

.map-overlay-panel.collapsed {
  background: rgba(0, 0, 0, 0.6);
}

.map-overlay-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  min-height: 2rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}

.map-overlay-toggle:hover {
  color: var(--color-white);
}

.map-overlay-body {
  padding: 0.4rem 0.6rem 0.4rem 0;
  min-width: 10rem;
}

.map-overlay-heading {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  margin-bottom: 0.3rem;
}

.map-overlay-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.map-overlay-item:hover {
  color: var(--color-white);
}

.map-overlay-item input[type="checkbox"] {
  accent-color: var(--accent);
  margin: 0;
  cursor: pointer;
}

.map-overlay-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-overlay-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.map-overlay-icon-sm {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.map-overlay-section + .map-overlay-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-accent-tint-15);
}

.map-overlay-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.4rem;
  padding: 0.2rem 0 0.1rem 1.6rem;
  max-width: 10rem;
  font-size: 0.6rem;
  color: var(--text-secondary);
}

.map-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.map-legend-pin {
  flex-shrink: 0;
}

.map-overlay-item-label {
  white-space: nowrap;
}

.map-overlay-info-icon {
  margin-left: -0.1rem;
  color: rgba(100, 160, 255, 0.5);
  cursor: help;
  display: flex;
  align-items: flex-end;
  align-self: stretch;
  padding-bottom: 0.25rem;
}

.map-overlay-info-icon:hover {
  color: rgba(100, 160, 255, 0.9);
}

.map-info-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  color: #ccc;
  border: 1px solid rgba(200, 168, 78, 0.3);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.72rem;
  line-height: 1.4;
  max-width: 230px;
  pointer-events: none;
  box-shadow: 0 2px 8px var(--color-overlay-black-50);
}

.map-info-tooltip-content {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

.map-info-tooltip-icon {
  flex-shrink: 0;
  color: rgba(200, 168, 78, 0.7);
  margin-top: 1px;
}

.map-info-tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(200, 168, 78, 0.4);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.map-debug-label {
  font-size: 0.65rem;
  opacity: 0.5;
}

/* --- Player layer in panel --- */
.map-player-goto-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-left: auto;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--color-accent-tint-20);
  border-radius: 3px;
  background: var(--color-accent-tint-6);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.map-player-goto-btn:hover {
  color: var(--color-white);
  background: var(--color-accent-tint-15);
}

.map-overlay-count {
  margin-left: auto;
  font-size: 0.6rem;
  color: var(--text-secondary);
  opacity: 0.5;
}

/* --- Save import button + flyout --- */
.map-save-panel {
  display: flex;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-radius: 6px;
  font-size: 0.8rem;
}

.map-save-panel.collapsed {
  background: rgba(0, 0, 0, 0.6);
}

.map-save-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  min-height: 2rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
}

.map-save-toggle:hover {
  color: var(--color-white);
}

.map-save-dot {
  position: absolute;
  top: 5px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd740;
  box-shadow: 0 0 4px rgba(255, 215, 64, 0.6);
}

.map-save-body {
  padding: 0.4rem 0.6rem 0.4rem 0;
  white-space: nowrap;
  min-width: 10rem;
}

/* --- Save panel: loaded state --- */
.map-save-player-name {
  color: #ddd;
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.2;
  margin-bottom: 0.15rem;
}

.map-save-location {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.map-save-location-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.map-save-date {
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.6;
  margin-top: 0.1rem;
  margin-bottom: 0.4rem;
}

.map-save-location + .map-save-actions {
  margin-top: 0.45rem;
}

.map-save-actions {
  display: flex;
  gap: 0.3rem;
}

.map-save-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-accent-tint-20);
  border-radius: 4px;
  background: var(--color-accent-tint-6);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.map-save-action-btn:hover {
  color: var(--color-white);
  background: var(--color-accent-tint-15);
}

.map-save-action-clear:hover {
  color: #ef5350;
  border-color: rgba(239, 83, 80, 0.3);
  background: rgba(239, 83, 80, 0.1);
}

/* --- Save panel: dropzone --- */
.map-save-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 0.8rem;
  border: 2px dashed var(--color-accent-tint-20);
  border-radius: 6px;
  transition: border-color 0.15s, background 0.15s;
}

.map-save-dropzone.dragover {
  border-color: rgba(200, 168, 78, 0.6);
  background: var(--color-accent-tint-6);
}

.map-save-dropzone-icon {
  color: var(--text-secondary);
  opacity: 0.5;
}

.map-save-dropzone-label {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.map-save-browse-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid rgba(200, 168, 78, 0.3);
  border-radius: 4px;
  background: var(--color-accent-tint-8);
  color: var(--accent);
  font-size: 0.72rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
}

.map-save-browse-btn:hover {
  background: rgba(200, 168, 78, 0.18);
}

.map-save-error {
  font-size: 0.65rem;
  color: #ef5350;
  margin-top: 0.4rem;
}

/* --- Full-screen drag overlay --- */
.map-drag-overlay {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: var(--color-overlay-black-70);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.map-drag-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  color: var(--accent);
  font-size: 1rem;
  font-weight: 600;
  padding: 2rem 3rem;
  border: 2px dashed rgba(200, 168, 78, 0.5);
  border-radius: 12px;
  background: var(--color-accent-tint-5);
}

/* Fade transition for drag overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- Search bar --- */
.map-search {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 1000;
  width: 18rem;
  transition: width 0.15s ease;
}

.map-search.open {
  width: 24rem;
}

.map-search-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-radius: 6px;
}

.map-search.open .map-search-input-wrap {
  border-radius: 6px 6px 0 0;
  border-bottom-color: var(--color-accent-tint-12);
}

.map-search-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.map-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #ddd;
  font-size: 0.85rem;
  font-family: inherit;
  min-width: 0;
}

.map-search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.map-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.1rem;
  border-radius: 3px;
}

.map-search-clear:hover {
  color: var(--color-white);
}

.map-search-results {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 20rem;
  overflow-y: auto;
}

.map-search-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: none;
  background: none;
  color: #ddd;
  font-size: 0.78rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.map-search-result:hover,
.map-search-result.active {
  background: var(--color-accent-tint-12);
}

.map-search-result-type {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  width: 5.5rem;
  opacity: 0.85;
}

.map-search-result-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-search-result-level {
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

.map-search-empty {
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 168, 78, 0.25);
  border-top: none;
  border-radius: 0 0 6px 6px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-align: center;
}

@media (max-width: 768px) {
  .maps-view {
    min-height: calc(100vh - 6rem);
  }

  .map-controls-col {
    top: auto;
    bottom: 0.6rem;
    flex-direction: column-reverse;
  }

  .map-search {
    width: calc(100% - 1.2rem);
  }

  .map-search.open {
    width: calc(100% - 1.2rem);
  }
}
</style>

<style>
/* Leaflet overrides — must be unscoped to affect Leaflet's DOM */
.leaflet-container {
  background: var(--color-black) !important;
}

.map-level-label {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-faction-marker {
  background: transparent !important;
  border: none !important;
}

.map-player-marker {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-player-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #76ff03;
  border: 2.5px solid var(--color-overlay-black-50);
  box-shadow: 0 0 0 2px rgba(118, 255, 3, 0.35);
}

.map-player-pulse {
  animation: player-pulse 2.5s ease-in-out infinite;
}

@keyframes player-pulse {
  0%, 100% { opacity: 0.4; stroke-width: 2; }
  50% { opacity: 0.8; stroke-width: 3; }
}

.map-stash-marker {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.5));
}

.map-campfire-marker {
  background: transparent !important;
  border: none !important;
}

.map-campfire-img {
  display: block;
  /* White SVG → dark orange: invert to black, then shift to orange */
  filter: brightness(0) saturate(100%) invert(45%) sepia(95%) saturate(600%) hue-rotate(5deg) brightness(90%);
}

.map-lc-marker {
  background: transparent !important;
  border: none !important;
}

.map-lc-marker img {
  display: block;
}

.map-cluster-badge {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-cluster-badge span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(66, 133, 244, 0.9);
  color: var(--color-white);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 1px 4px var(--color-overlay-black-50);
  transition: transform 0.15s ease;
}

.map-cluster-badge span:hover {
  transform: scale(1.15);
  background: rgba(66, 133, 244, 1);
}

.map-cluster-popup-wrap .leaflet-popup-close-button {
  display: none;
}

.map-cluster-popup-wrap .leaflet-popup-content-wrapper {
  background: rgba(0, 0, 0, 0.92);
  color: #ddd;
  border: 1px solid rgba(200, 168, 78, 0.4);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  padding: 0;
}

.map-cluster-popup-wrap .leaflet-popup-content {
  margin: 0;
  width: auto !important;
  max-width: 400px;
}

.map-cluster-popup-wrap .leaflet-popup-tip {
  background: rgba(0, 0, 0, 0.92);
  border: 1px solid rgba(200, 168, 78, 0.4);
}

.map-cluster-popup {
  max-height: 250px;
  overflow-y: auto;
  padding: 0.3rem 0;
}

.map-cluster-popup-header {
  padding: 0.4rem 0.6rem 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(200, 168, 78, 0.9);
  border-bottom: 1px solid var(--color-accent-tint-20);
  margin-bottom: 0.15rem;
}

.map-cluster-popup-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  height: 48px;
  box-sizing: border-box;
  cursor: default;
  font-size: 0.75rem;
}

.map-cluster-popup-item:hover {
  background: var(--color-accent-tint-12);
}

.map-cluster-popup-icon-cell {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.map-cluster-popup-pin,
.map-cluster-popup-lcicon {
  display: block;
}

.map-cluster-popup-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.map-cluster-popup-name {
  color: #ddd;
  white-space: nowrap;
}

.map-cluster-popup-meta {
  color: rgba(200, 200, 200, 0.5);
  font-size: 0.65rem;
  white-space: nowrap;
}

.map-cluster-popup-fac {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  margin-left: auto;
  opacity: 0.7;
}

.map-cluster-popup-lcicon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.map-location-label {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.map-location-label span {
  display: inline-block;
  transform: translate(-50%, -50%);
  color: rgba(200, 200, 200, 0.7);
  font-size: 0.6rem;
  white-space: nowrap;
  padding: 0.1rem 0.35rem;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 3px;
  cursor: pointer;
}

.map-location-label span:hover {
  color: var(--color-overlay-white-90);
}

.map-npc-marker {
  background: transparent !important;
  border: none !important;
}

.map-float-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.9);
  color: #ddd;
  border: 2px solid rgba(200, 168, 78, 0.6);
  border-radius: 5px;
  font-size: 0.85rem;
  padding: 0.6rem 0.8rem;
  box-shadow: 0 2px 12px var(--color-overlay-black-70);
  pointer-events: none;
  width: max-content;
  max-width: 320px;
}

.map-float-tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid rgba(200, 168, 78, 0.6);
  transform: rotate(45deg);
  border-top: none;
  border-left: none;
}

.map-npc-tip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.map-npc-tip-icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.map-npc-tip-meta {
  opacity: 0.6;
  font-size: 0.75rem;
}

.map-faction-tip-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.3rem;
}

.map-faction-tip-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #ccc;
}

.map-faction-tip-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.map-debug-info {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--color-accent-tint-20);
  font-size: 0.6rem;
  font-family: monospace;
  color: rgba(150, 200, 150, 0.8);
  line-height: 1.4;
  max-width: 280px;
  word-break: break-all;
}

.map-level-label span {
  display: inline-block;
  transform: translate(-50%, -50%) scale(var(--label-scale, 1));
  color: rgba(220, 220, 220, 0.8);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  padding: 0.15rem 0.5rem;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 3px;
  pointer-events: none;
}

.map-search-highlight {
  animation: map-search-pulse 2.5s ease-out forwards;
}

@keyframes map-search-pulse {
  0%   { stroke-opacity: 1; fill-opacity: 0.3; stroke-width: 3; }
  50%  { stroke-opacity: 0.7; fill-opacity: 0.15; stroke-width: 2; }
  100% { stroke-opacity: 0; fill-opacity: 0; stroke-width: 1; }
}
</style>
