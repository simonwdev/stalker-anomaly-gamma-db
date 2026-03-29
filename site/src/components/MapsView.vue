<template>
  <div class="maps-view">
    <div ref="mapContainer" class="map-container"></div>
    <div class="maps-banner">
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
import { defineComponent, ref, onMounted, onBeforeUnmount, inject } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TileMetadata {
  tileSize: number;
  maxZoom: number;
  baseMaxZoom: number;
  format: string;
  imageWidth: number;
  imageHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  canvasSize: number;
}

export default defineComponent({
  name: 'MapsView',
  inject: ['t'],
  setup() {
    const mapContainer = ref<HTMLElement | null>(null);
    const t = inject<(key: string) => string>('t', (k) => k);

    let map: L.Map | null = null;

    async function initMap() {
      if (!mapContainer.value) return;

      const TILES_BASE = 'https://tiles.stalker-anomaly-db.com';

      const metaRes = await fetch(`${TILES_BASE}/metadata.json`);
      const meta: TileMetadata = await metaRes.json();

      const { scaledWidth: imgW, scaledHeight: imgH, maxZoom, baseMaxZoom, tileSize } = meta;

      map = L.map(mapContainer.value, {
        crs: L.CRS.Simple,
        minZoom: 0,
        maxZoom,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        attributionControl: false,
      });

      // unproject using baseMaxZoom (zoom 5) — that's where the canvas/image pixel
      // dimensions are defined. Higher zooms are per-level detail overlays.
      const imgSouthWest = map.unproject([0, imgH], baseMaxZoom);
      const imgNorthEast = map.unproject([imgW, 0], baseMaxZoom);
      const imageBounds = L.latLngBounds(imgSouthWest, imgNorthEast);

      map.setMaxBounds(imageBounds.pad(0.2));
      map.options.maxBoundsViscosity = 0.8;

      // Base layer: upscales zoom 7 tiles as fallback at zoom 8
      L.tileLayer(`${TILES_BASE}/{z}/{x}/{y}.${meta.format}`, {
        tileSize,
        maxZoom,
        maxNativeZoom: maxZoom - 1,
        minZoom: 0,
        noWrap: true,
        bounds: imageBounds,
        errorTileUrl: '',
      }).addTo(map);

      // Detail layer: crisp zoom 8 per-level tiles where they exist
      L.tileLayer(`${TILES_BASE}/{z}/{x}/{y}.${meta.format}`, {
        tileSize,
        maxZoom,
        minZoom: maxZoom,
        minNativeZoom: maxZoom,
        noWrap: true,
        bounds: imageBounds,
        errorTileUrl: '',
      }).addTo(map);

      // Center on Cordon: rawRect (358,2022)→(564,2434) in 1024x2634 space
      const cordonSW = map.unproject([358 / 1024 * imgW, 2434 / 2634 * imgH], baseMaxZoom);
      const cordonNE = map.unproject([564 / 1024 * imgW, 2022 / 2634 * imgH], baseMaxZoom);
      map.fitBounds(L.latLngBounds(cordonSW, cordonNE));
      setTimeout(() => map?.invalidateSize(), 100);
    }

    onMounted(() => {
      initMap();
    });

    onBeforeUnmount(() => {
      if (map) {
        map.remove();
        map = null;
      }
    });

    return {
      mapContainer,
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
  top: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: rgba(0, 0, 0, 0.7);
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

.map-container {
  position: absolute;
  inset: 0;
  background: #000;
}

@media (max-width: 768px) {
  .maps-view {
    min-height: calc(100vh - 6rem);
  }
}
</style>

<style>
/* Leaflet overrides — must be unscoped to affect Leaflet's DOM */
.leaflet-container {
  background: #000 !important;
}
</style>
