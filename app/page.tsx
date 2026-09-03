'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import mapboxgl, { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Bike,
  Box,
  Building2,
  Car,
  Footprints,
  Layers3,
  LocateFixed,
  LockKeyhole,
  MapPinned,
  Mountain,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Route,
  X,
} from 'lucide-react';

const MAPBOX_TOKEN =
  'pk.eyJ1Ijoia2FuZXN1YW4iLCJhIjoiY2s5bm5zM3g5MDQ5cTNmbnh3d2d4MzR3cCJ9.TmjDSl2Bn3mO4fJceBUFJA';
const ACCESS_CODE_HASH = '16d74232d666243e3dd9711daaef2b7538f849efaa62cf19f91a97e82c420e34';
const GELEPHU: [number, number] = [90.48558, 26.87043];
const PROJECT_SOURCE_LAYER = 'fd497dec15e0cb165e9b';

const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };

const BASEMAPS = {
  light: { label: 'Light planning', style: 'mapbox://styles/mapbox/light-v11' },
  outdoors: { label: 'Outdoors terrain', style: 'mapbox://styles/mapbox/outdoors-v12' },
  satellite: { label: 'Satellite streets', style: 'mapbox://styles/mapbox/satellite-streets-v12' },
  dark: { label: 'Dark contrast', style: 'mapbox://styles/mapbox/dark-v11' },
} as const;

type BasemapId = keyof typeof BASEMAPS;
type TravelProfile = 'walking' | 'cycling' | 'driving';
type IsoMode = 'time' | 'distance';
type LayerKey = 'polygons' | 'contours' | 'buildings' | 'boundaries';

type MapSettings = {
  view3D: boolean;
  polygons: boolean;
  contours: boolean;
  buildings: boolean;
  boundaries: boolean;
  polygonColor: string;
  polygonOpacity: number;
};

type HoverInfo = {
  landuse: string;
  landarea: string;
  far: string;
  gfa: string;
};

const initialSettings: MapSettings = {
  view3D: false,
  polygons: true,
  contours: false,
  buildings: false,
  boundaries: true,
  polygonColor: '#ed9b32',
  polygonOpacity: 0.62,
};

function visibility(value: boolean): 'visible' | 'none' {
  return value ? 'visible' : 'none';
}

function safeSetVisibility(map: MapboxMap, layerId: string, isVisible: boolean) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility(isVisible));
}

function addOperationalLayers(
  map: MapboxMap,
  settings: MapSettings,
  isochroneData: FeatureCollection,
) {
  if (!map.getSource('isochrone')) {
    map.addSource('isochrone', { type: 'geojson', data: isochroneData });
  }
  if (!map.getLayer('isochrone-fill')) {
    map.addLayer({
      id: 'isochrone-fill',
      type: 'fill',
      source: 'isochrone',
      paint: { 'fill-color': '#1b7465', 'fill-opacity': 0.2 },
    });
    map.addLayer({
      id: 'isochrone-line',
      type: 'line',
      source: 'isochrone',
      paint: { 'line-color': '#0f4c43', 'line-width': 2.4, 'line-opacity': 0.9 },
    });
  }

  if (!map.getSource('idc-dmp')) {
    map.addSource('idc-dmp', {
      type: 'vector',
      url: 'mapbox://kanesuan.9jef0gth6vte',
      promoteId: 'OBJECTID',
    });
  }
  if (!map.getLayer('idc-dmp-fill')) {
    map.addLayer({
      id: 'idc-dmp-fill',
      type: 'fill',
      source: 'idc-dmp',
      'source-layer': PROJECT_SOURCE_LAYER,
      layout: { visibility: visibility(settings.polygons) },
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#67e8ff',
          settings.polygonColor,
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.9,
          ['boolean', ['feature-state', 'hover'], false],
          Math.min(settings.polygonOpacity + 0.2, 1),
          settings.polygonOpacity,
        ],
      },
    });
    map.addLayer({
      id: 'idc-dmp-outline',
      type: 'line',
      source: 'idc-dmp',
      'source-layer': PROJECT_SOURCE_LAYER,
      layout: { visibility: visibility(settings.polygons) },
      paint: { 'line-color': '#fff6df', 'line-width': 0.9, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'idc-dmp-selected-outline',
      type: 'line',
      source: 'idc-dmp',
      'source-layer': PROJECT_SOURCE_LAYER,
      layout: { visibility: visibility(settings.polygons) },
      paint: {
        'line-color': '#ffffff',
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          4,
          0,
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          1,
          0,
        ],
      },
    });
  }

  if (!map.getSource('terrain-contours')) {
    map.addSource('terrain-contours', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-terrain-v2',
    });
  }
  if (!map.getLayer('contour-lines')) {
    map.addLayer({
      id: 'contour-lines',
      type: 'line',
      source: 'terrain-contours',
      'source-layer': 'contour',
      minzoom: 9,
      layout: { visibility: visibility(settings.contours), 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.82,
        'line-width': ['match', ['get', 'index'], 10, 1.8, 5, 1.25, 0.72],
      },
    });
  }

  if (!map.getSource('streets-overlay')) {
    map.addSource('streets-overlay', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8',
    });
  }
  if (!map.getLayer('mapbox-boundaries')) {
    map.addLayer({
      id: 'mapbox-boundaries',
      type: 'line',
      source: 'streets-overlay',
      'source-layer': 'admin',
      filter: ['all', ['!=', 'maritime', 'true'], ['!=', 'disputed', 'true']],
      layout: { visibility: visibility(settings.boundaries), 'line-join': 'round' },
      paint: {
        'line-color': ['match', ['get', 'admin_level'], 0, '#f2b557', 1, '#ffffff', '#dce7e3'],
        'line-width': ['match', ['get', 'admin_level'], 0, 2.3, 1, 1.5, 0.9],
        'line-opacity': 0.92,
      },
    });
    map.addLayer({
      id: 'mapbox-boundaries-disputed',
      type: 'line',
      source: 'streets-overlay',
      'source-layer': 'admin',
      filter: ['all', ['!=', 'maritime', 'true'], ['==', 'disputed', 'true']],
      layout: { visibility: visibility(settings.boundaries) },
      paint: {
        'line-color': '#f2b557',
        'line-width': 1.6,
        'line-dasharray': [2, 2],
        'line-opacity': 0.9,
      },
    });
  }
  if (!map.getLayer('custom-3d-buildings')) {
    map.addLayer({
      id: 'custom-3d-buildings',
      type: 'fill-extrusion',
      source: 'streets-overlay',
      'source-layer': 'building',
      minzoom: 13,
      filter: ['==', 'extrude', 'true'],
      layout: { visibility: visibility(settings.buildings) },
      paint: {
        'fill-extrusion-color': '#d7c7a7',
        'fill-extrusion-height': ['coalesce', ['get', 'height'], 6],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-opacity': 0.82,
        'fill-extrusion-vertical-gradient': true,
      },
    });
  }

  if (!map.getSource('terrain-dem')) {
    map.addSource('terrain-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  if (settings.view3D) {
    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.25 });
  } else {
    map.setTerrain(null);
  }
}

function formatMetric(value: unknown, digits = 2): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return numeric.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function featureInfo(properties: Record<string, unknown> | null | undefined): HoverInfo | null {
  if (!properties) return null;
  return {
    landuse: String(properties.Landuse ?? properties.Land_Type ?? '—'),
    landarea: formatMetric(properties.Shape_Area),
    far: formatMetric(properties.FAR_Num),
    gfa: formatMetric(properties.GFA),
  };
}

async function hashValue(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const selectedIdRef = useRef<string | number | null>(null);
  const pickingOriginRef = useRef(false);
  const settingsRef = useRef<MapSettings>(initialSettings);
  const originRef = useRef<[number, number]>(GELEPHU);
  const isochroneDataRef = useRef<FeatureCollection>(EMPTY_GEOJSON);

  const [locked, setLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [basemap, setBasemap] = useState<BasemapId>('satellite');
  const [settings, setSettings] = useState<MapSettings>(initialSettings);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<HoverInfo | null>(null);
  const [controlsOpen, setControlsOpen] = useState(true);

  const [isoPanelOpen, setIsoPanelOpen] = useState(false);
  const [isoMode, setIsoMode] = useState<IsoMode>('time');
  const [profile, setProfile] = useState<TravelProfile>('walking');
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [distanceKm, setDistanceKm] = useState(5);
  const [origin, setOrigin] = useState<[number, number]>(GELEPHU);
  const [pickingOrigin, setPickingOrigin] = useState(false);
  const [isoStatus, setIsoStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isoMessage, setIsoMessage] = useState('');

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAPS.satellite.style,
      center: GELEPHU,
      zoom: 11.35,
      pitch: 0,
      bearing: 0,
      antialias: true,
      maxPitch: 75,
      attributionControl: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      addOperationalLayers(map, settingsRef.current, isochroneDataRef.current);
      setMapReady(true);
    });

    map.on('mousemove', 'idc-dmp-fill', (event) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = event.features?.[0];
      if (!feature) return;

      if (hoveredIdRef.current !== null) {
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: hoveredIdRef.current },
          { hover: false },
        );
      }
      if (feature.id !== undefined) {
        hoveredIdRef.current = feature.id;
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: feature.id },
          { hover: true },
        );
      }

      setHoverInfo(featureInfo(feature.properties as Record<string, unknown> | null));
    });

    map.on('mouseleave', 'idc-dmp-fill', () => {
      map.getCanvas().style.cursor = pickingOriginRef.current ? 'crosshair' : '';
      if (hoveredIdRef.current !== null && map.getSource('idc-dmp')) {
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: hoveredIdRef.current },
          { hover: false },
        );
      }
      hoveredIdRef.current = null;
      setHoverInfo(null);
    });

    map.on('click', (event) => {
      if (pickingOriginRef.current) {
        const nextOrigin: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        originRef.current = nextOrigin;
        setOrigin(nextOrigin);
        markerRef.current?.setLngLat(nextOrigin);
        pickingOriginRef.current = false;
        setPickingOrigin(false);
        map.getCanvas().style.cursor = '';
        setIsoStatus('idle');
        setIsoMessage('Origin updated. Run the analysis when ready.');
        return;
      }

      const features = map.getLayer('idc-dmp-fill')
        ? map.queryRenderedFeatures(event.point, { layers: ['idc-dmp-fill'] })
        : [];
      const feature = features[0];

      if (selectedIdRef.current !== null && map.getSource('idc-dmp')) {
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: selectedIdRef.current },
          { selected: false },
        );
      }

      if (feature?.id !== undefined) {
        selectedIdRef.current = feature.id;
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: feature.id },
          { selected: true },
        );
        setSelectedInfo(featureInfo(feature.properties as Record<string, unknown> | null));
      } else {
        selectedIdRef.current = null;
        setSelectedInfo(null);
      }
    });

    map.on('error', (event) => {
      const message = event.error?.message ?? '';
      if (message.toLowerCase().includes('idc') || message.toLowerCase().includes('9jef0gth6vte')) {
        setMapError('The IDC planning layer could not be loaded. Check the Mapbox token access.');
      }
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const updateSettings = (patch: Partial<MapSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    safeSetVisibility(map, 'idc-dmp-fill', next.polygons);
    safeSetVisibility(map, 'idc-dmp-outline', next.polygons);
    safeSetVisibility(map, 'idc-dmp-selected-outline', next.polygons);
    safeSetVisibility(map, 'contour-lines', next.contours);
    safeSetVisibility(map, 'custom-3d-buildings', next.buildings);
    safeSetVisibility(map, 'mapbox-boundaries', next.boundaries);
    safeSetVisibility(map, 'mapbox-boundaries-disputed', next.boundaries);

    if (map.getLayer('idc-dmp-fill')) {
      map.setPaintProperty('idc-dmp-fill', 'fill-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#67e8ff',
        next.polygonColor,
      ]);
      map.setPaintProperty('idc-dmp-fill', 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.9,
        ['boolean', ['feature-state', 'hover'], false],
        Math.min(next.polygonOpacity + 0.2, 1),
        next.polygonOpacity,
      ]);
    }

    if (patch.view3D !== undefined) {
      if (next.view3D && map.getSource('terrain-dem')) {
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.25 });
      } else {
        map.setTerrain(null);
      }
      map.easeTo({
        pitch: next.view3D ? 58 : 0,
        bearing: next.view3D ? -18 : 0,
        zoom: Math.max(map.getZoom(), next.view3D ? 12.3 : 11.35),
        duration: 900,
      });
    }
  };

  const changeBasemap = (nextBasemap: BasemapId) => {
    const map = mapRef.current;
    setBasemap(nextBasemap);
    if (!map) return;
    setMapReady(false);
    setMapError('');
    map.setStyle(BASEMAPS[nextBasemap].style);
    map.once('style.load', () => {
      addOperationalLayers(map, settingsRef.current, isochroneDataRef.current);
      if (selectedIdRef.current !== null) {
        map.setFeatureState(
          { source: 'idc-dmp', sourceLayer: PROJECT_SOURCE_LAYER, id: selectedIdRef.current },
          { selected: true },
        );
      }
      if (settingsRef.current.view3D) {
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.25 });
      }
      setMapReady(true);
    });
  };

  const toggleLayer = (key: LayerKey) => {
    updateSettings({ [key]: !settingsRef.current[key] } as Partial<MapSettings>);
  };

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if ((await hashValue(password.trim())) === ACCESS_CODE_HASH) {
      setLocked(false);
      setPasswordError(false);
      setPassword('');
      window.setTimeout(() => mapRef.current?.resize(), 140);
      return;
    }
    setPasswordError(true);
    setPassword('');
  };

  const ensureOriginMarker = () => {
    const map = mapRef.current;
    if (!map || markerRef.current) return;
    const marker = new mapboxgl.Marker({ color: '#e7922f', draggable: true })
      .setLngLat(originRef.current)
      .addTo(map);
    marker.on('dragend', () => {
      const point = marker.getLngLat();
      const nextOrigin: [number, number] = [point.lng, point.lat];
      originRef.current = nextOrigin;
      setOrigin(nextOrigin);
      setIsoStatus('idle');
      setIsoMessage('Origin moved. Run the analysis to refresh the result.');
    });
    markerRef.current = marker;
  };

  const toggleIsochronePanel = () => {
    const nextOpen = !isoPanelOpen;
    setIsoPanelOpen(nextOpen);
    if (nextOpen) {
      ensureOriginMarker();
      setControlsOpen(false);
    } else {
      pickingOriginRef.current = false;
      setPickingOrigin(false);
      mapRef.current?.getCanvas().style.setProperty('cursor', '');
      markerRef.current?.remove();
      markerRef.current = null;
    }
  };

  const startOriginPick = () => {
    ensureOriginMarker();
    pickingOriginRef.current = true;
    setPickingOrigin(true);
    mapRef.current?.getCanvas().style.setProperty('cursor', 'crosshair');
    setIsoMessage('Click anywhere on the map to set a new origin.');
  };

  const clearIsochrone = () => {
    isochroneDataRef.current = EMPTY_GEOJSON;
    const source = mapRef.current?.getSource('isochrone') as GeoJSONSource | undefined;
    source?.setData(EMPTY_GEOJSON);
    setIsoStatus('idle');
    setIsoMessage('Result cleared.');
  };

  const runIsochrone = async () => {
    const map = mapRef.current;
    if (!map) return;
    setIsoStatus('loading');
    setIsoMessage('Calculating reachable area…');

    const contourParam =
      isoMode === 'time'
        ? `contours_minutes=${Math.min(Math.max(Math.round(timeMinutes), 1), 60)}`
        : `contours_meters=${Math.min(Math.max(Math.round(distanceKm * 1000), 1), 100000)}`;
    const [lng, lat] = originRef.current;
    const url =
      `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}` +
      `?${contourParam}&polygons=true&denoise=1&generalize=35&access_token=${MAPBOX_TOKEN}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorData?.message || `Mapbox returned ${response.status}`);
      }
      const data = (await response.json()) as FeatureCollection;
      isochroneDataRef.current = data;
      const source = map.getSource('isochrone') as GeoJSONSource | undefined;
      source?.setData(data);

      const bounds = new mapboxgl.LngLatBounds();
      const addCoordinates = (coordinates: unknown) => {
        if (!Array.isArray(coordinates)) return;
        if (
          coordinates.length >= 2 &&
          typeof coordinates[0] === 'number' &&
          typeof coordinates[1] === 'number'
        ) {
          bounds.extend(coordinates as [number, number]);
          return;
        }
        coordinates.forEach(addCoordinates);
      };
      data.features.forEach((feature) => {
        const geometry = feature.geometry;
        if (geometry && 'coordinates' in geometry) addCoordinates(geometry.coordinates);
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 90, duration: 900, maxZoom: 13.5 });
      setIsoStatus('ready');
      setIsoMessage(
        isoMode === 'time'
          ? `${timeMinutes} minute reachable area is shown on the map.`
          : `${distanceKm} km reachable area is shown on the map.`,
      );
    } catch (error) {
      setIsoStatus('error');
      setIsoMessage(error instanceof Error ? error.message : 'Unable to calculate the reachable area.');
    }
  };

  return (
    <main className="app-shell">
      <div ref={mapContainer} className="map-canvas" aria-label="Interactive GIS map of Gelephu" />

      <header className="topbar">
        <div className="brand-mark" aria-hidden="true"><MapPinned size={20} /></div>
        <div className="brand-copy">
          <span className="eyebrow">GELEPHU · BHUTAN</span>
          <h1>IDC Development Map</h1>
        </div>
        <div className={`map-status ${mapReady ? 'is-ready' : ''}`}>
          <span />{mapReady ? 'Map live' : 'Loading map'}
        </div>
        <div className="topbar-actions">
          <button
            className="icon-action controls-toggle"
            onClick={() => { setControlsOpen(!controlsOpen); setIsoPanelOpen(false); }}
            aria-label={controlsOpen ? 'Hide map tools' : 'Show map tools'}
            aria-pressed={controlsOpen}
            title={controlsOpen ? 'Hide map tools' : 'Show map tools'}
          >{controlsOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button>
          <button
            className="text-action"
            onClick={() => mapRef.current?.flyTo({ center: GELEPHU, zoom: 11.35, duration: 900 })}
            title="Return to Gelephu"
          ><LocateFixed size={16} />Gelephu</button>
          <button className={`text-action primary ${isoPanelOpen ? 'active' : ''}`} onClick={toggleIsochronePanel}>
            <Route size={16} />Reach
          </button>
        </div>
      </header>

      <aside className={`control-rail ${controlsOpen ? 'is-open' : 'is-hidden'}`} aria-label="Map controls">
        <div className="panel-heading">
          <div><span className="eyebrow">MAP DISPLAY</span><h2>Explore the plan</h2></div>
          <button className="panel-close" onClick={() => setControlsOpen(false)} aria-label="Hide map tools"><X size={17} /></button>
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="basemap-select">BASEMAP</label>
          <select
            id="basemap-select"
            className="basemap-select"
            value={basemap}
            onChange={(event) => changeBasemap(event.target.value as BasemapId)}
          >
            {Object.entries(BASEMAPS).map(([id, item]) => (
              <option key={id} value={id}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="control-group compact-group">
          <span className="control-label">VIEW MODE</span>
          <div className="segmented-control">
            <button className={!settings.view3D ? 'active' : ''} onClick={() => updateSettings({ view3D: false })}>2D</button>
            <button className={settings.view3D ? 'active' : ''} onClick={() => updateSettings({ view3D: true })}><Box size={15} />3D terrain</button>
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">MAP LAYERS</span>
          <div className="layer-list">
            <LayerToggle
              icon={<Layers3 size={16} />}
              title="IDC DMP A"
              subtitle="Planning polygons"
              checked={settings.polygons}
              onChange={() => toggleLayer('polygons')}
            />
            <LayerToggle
              icon={<Mountain size={16} />}
              title="Contours"
              subtitle="White elevation lines"
              checked={settings.contours}
              onChange={() => toggleLayer('contours')}
            />
            <LayerToggle
              icon={<Building2 size={16} />}
              title="3D buildings"
              subtitle="Visible from zoom 13"
              checked={settings.buildings}
              onChange={() => toggleLayer('buildings')}
            />
            <LayerToggle
              icon={<MapPinned size={16} />}
              title="Mapbox boundary"
              subtitle="Administrative limits"
              checked={settings.boundaries}
              onChange={() => toggleLayer('boundaries')}
            />
          </div>
        </div>

        <div className="control-group style-controls">
          <div className="style-title"><span className="control-label">POLYGON STYLE</span><Palette size={15} /></div>
          <div className="style-row">
            <label htmlFor="polygon-color">Color</label>
            <input
              id="polygon-color"
              type="color"
              value={settings.polygonColor}
              onChange={(event) => updateSettings({ polygonColor: event.target.value })}
            />
          </div>
          <div className="range-label">
            <label htmlFor="polygon-opacity">Opacity</label>
            <output>{Math.round(settings.polygonOpacity * 100)}%</output>
          </div>
          <input
            id="polygon-opacity"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={settings.polygonOpacity}
            onChange={(event) => updateSettings({ polygonOpacity: Number(event.target.value) })}
          />
        </div>

        <p className="rail-note">Hover over a polygon to inspect Landuse, Landarea, FAR and GFA.</p>
      </aside>

      {isoPanelOpen && (
        <aside className="iso-panel" aria-label="Isochrone reach analysis">
          <div className="iso-heading">
            <div><span className="eyebrow">ACCESS ANALYSIS</span><h2>Reach from a point</h2></div>
            <button onClick={toggleIsochronePanel} aria-label="Close reach analysis"><X size={18} /></button>
          </div>
          <p className="iso-intro">Choose travel mode and calculate an area reachable by time or distance.</p>

          <div className="control-group">
            <span className="control-label">TRAVEL MODE</span>
            <div className="profile-grid">
              <ProfileButton icon={<Footprints size={17} />} label="Walk" active={profile === 'walking'} onClick={() => setProfile('walking')} />
              <ProfileButton icon={<Bike size={17} />} label="Cycle" active={profile === 'cycling'} onClick={() => setProfile('cycling')} />
              <ProfileButton icon={<Car size={17} />} label="Drive" active={profile === 'driving'} onClick={() => setProfile('driving')} />
            </div>
          </div>

          <div className="control-group compact-group">
            <span className="control-label">MEASURE BY</span>
            <div className="segmented-control">
              <button className={isoMode === 'time' ? 'active' : ''} onClick={() => setIsoMode('time')}>Time</button>
              <button className={isoMode === 'distance' ? 'active' : ''} onClick={() => setIsoMode('distance')}>Distance</button>
            </div>
          </div>

          <div className="control-group value-control">
            {isoMode === 'time' ? (
              <>
                <div className="range-label"><label htmlFor="time-range">Travel time</label><output>{timeMinutes} min</output></div>
                <input id="time-range" type="range" min="1" max="60" step="1" value={timeMinutes} onChange={(event) => setTimeMinutes(Number(event.target.value))} />
                <div className="range-scale"><span>1 min</span><span>60 min</span></div>
              </>
            ) : (
              <>
                <div className="range-label"><label htmlFor="distance-range">Travel distance</label><output>{distanceKm} km</output></div>
                <input id="distance-range" type="range" min="1" max="100" step="1" value={distanceKm} onChange={(event) => setDistanceKm(Number(event.target.value))} />
                <div className="range-scale"><span>1 km</span><span>100 km</span></div>
              </>
            )}
          </div>

          <div className="origin-block">
            <div><span className="control-label">ORIGIN</span><strong>{origin[1].toFixed(5)}, {origin[0].toFixed(5)}</strong></div>
            <button className={pickingOrigin ? 'active' : ''} onClick={startOriginPick}>{pickingOrigin ? 'Click the map…' : 'Pick on map'}</button>
          </div>

          <button className="run-analysis" onClick={runIsochrone} disabled={isoStatus === 'loading'}>
            <Route size={17} />{isoStatus === 'loading' ? 'Calculating…' : 'Show reachable area'}
          </button>
          <button className="clear-analysis" onClick={clearIsochrone}>Clear result</button>

          {isoMessage && <div className={`iso-feedback ${isoStatus}`}>{isoMessage}</div>}
          <small className="usage-note">Limits: up to 60 minutes or 100 km per Mapbox request.</small>
        </aside>
      )}

      {(selectedInfo ?? hoverInfo) && !isoPanelOpen && (
        <section className={`feature-card ${selectedInfo ? 'is-selected' : ''}`} aria-live="polite">
          <div className="feature-card__title"><span />{selectedInfo ? 'Selected area' : 'Quick look'}</div>
          <dl>
            <div className="feature-card__wide"><dt>Landuse</dt><dd>{(selectedInfo ?? hoverInfo)?.landuse}</dd></div>
            <div><dt>Landarea</dt><dd>{(selectedInfo ?? hoverInfo)?.landarea}<small>m²</small></dd></div>
            <div><dt>FAR</dt><dd>{(selectedInfo ?? hoverInfo)?.far}</dd></div>
            <div className="feature-card__wide"><dt>GFA</dt><dd>{(selectedInfo ?? hoverInfo)?.gfa}<small>m²</small></dd></div>
          </dl>
          {selectedInfo && <p className="selection-hint">Click empty map space to clear selection.</p>}
        </section>
      )}

      {mapError && <div className="map-error" role="alert">{mapError}</div>}

      {locked && (
        <div className="access-gate">
          <div className="gate-grid" aria-hidden="true" />
          <section className="gate-card" aria-labelledby="gate-title">
            <div className="gate-icon"><LockKeyhole size={25} /></div>
            <span className="eyebrow">RESTRICTED VIEW · IDC</span>
            <h2 id="gate-title">Enter the project map</h2>
            <p>Use the access code shared with the project team.</p>
            <form onSubmit={unlock}>
              <label htmlFor="project-password">Access code</label>
              <input
                id="project-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter access code"
                autoFocus
                aria-invalid={passwordError}
                autoComplete="off"
              />
              {passwordError && <span className="form-error">Access code is incorrect. Please try again.</span>}
              <button type="submit">Open map <span aria-hidden="true">→</span></button>
            </form>
            <small>You will be asked again whenever this page is reopened or refreshed.</small>
          </section>
        </div>
      )}
    </main>
  );
}

function LayerToggle({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="layer-row">
      <span className="layer-icon" aria-hidden="true">{icon}</span>
      <div><strong>{title}</strong><small>{subtitle}</small></div>
      <button
        className={`switch ${checked ? 'active' : ''}`}
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={`${checked ? 'Hide' : 'Show'} ${title}`}
      ><span /></button>
    </div>
  );
}

function ProfileButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick} aria-pressed={active}>
      {icon}<span>{label}</span>
    </button>
  );
}

