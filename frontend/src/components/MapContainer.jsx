import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMapEvents, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issues in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Minimum on-screen pixel distance between points while dragging in freehand
// mode, so we don't flood drawnPoints with hundreds of near-duplicate points.
const FREEHAND_MIN_PIXEL_GAP = 14;
// How close (in pixels) a click needs to be to the first point to "close"
// a shape and turn it into a polygon.
const SHAPE_CLOSE_PIXEL_RADIUS = 12;

// Map click / drag listener component
// drawMode: 'straight' | 'freehand' | 'shape' | null
function MapEvents({ drawMode, drawnPoints, onAddPoint, onCloseShape }) {
  const isMouseDownRef = useRef(false);
  const map = useMap();

  useMapEvents({
    mousedown(e) {
      if (drawMode === 'freehand') {
        isMouseDownRef.current = true;
        onAddPoint(e.latlng);
      }
    },
    mousemove(e) {
      if (drawMode === 'freehand' && isMouseDownRef.current) {
        // Throttle by pixel distance so we get a smooth curve, not a point-flood
        const last = drawnPoints[drawnPoints.length - 1];
        if (last) {
          const lastPx = map.latLngToContainerPoint(L.latLng(last[0], last[1]));
          const curPx = map.latLngToContainerPoint(e.latlng);
          const dist = lastPx.distanceTo(curPx);
          if (dist < FREEHAND_MIN_PIXEL_GAP) return;
        }
        onAddPoint(e.latlng);
      }
    },
    mouseup() {
      if (drawMode === 'freehand') {
        isMouseDownRef.current = false;
      }
    },
    click(e) {
      if (drawMode === 'straight') {
        onAddPoint(e.latlng);
      }
      if (drawMode === 'shape') {
        // If there's already a shape in progress and the click lands near
        // the first point, close the shape into a polygon instead of adding
        // a new point.
        if (drawnPoints.length >= 3) {
          const first = drawnPoints[0];
          const firstPx = map.latLngToContainerPoint(L.latLng(first[0], first[1]));
          const clickPx = map.latLngToContainerPoint(e.latlng);
          if (firstPx.distanceTo(clickPx) <= SHAPE_CLOSE_PIXEL_RADIUS) {
            onCloseShape();
            return;
          }
        }
        onAddPoint(e.latlng);
      }
    },
    dblclick() {
      // Double-click finishes a straight-line route
      if (drawMode === 'straight' && drawnPoints.length >= 2) {
        onCloseShape(); // for 'straight' this just signals "done", no closing loop
      }
    },
  });

  return null;
}

export default function MapComponent({
  layers,
  drawnPoints,
  setDrawnPoints,
  drawMode,           // 'straight' | 'freehand' | 'shape' | null
  isShapeClosed,      // true once a 'shape' polygon has been closed
  setIsShapeClosed,
  activeRouteId,
  alternativeRoutes,
  visibleLayers,
  onPathChange
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [basemap, setBasemap] = useState('satellite'); // 'satellite' | 'dark'
  const defaultCenter = [21.15, 79.09]; // Nagpur Division center
  const defaultZoom = 9;

  const emitPathChange = (points, closed) => {
    if (!onPathChange) return;
    // Send GeoJSON format [lon, lat] to parent for API analysis
    const geojsonCoords = points.map(pt => [pt[1], pt[0]]);
    if (closed && geojsonCoords.length > 0) {
      geojsonCoords.push(geojsonCoords[0]); // close the ring for Polygon GeoJSON
    }
    onPathChange(geojsonCoords, closed ? 'Polygon' : 'LineString');
  };

  // Add a point in straight / freehand / shape mode.
  // IMPORTANT: this only updates local state — it does NOT call onPathChange.
  // Calling the API on every point (especially in freehand mode, which can add
  // dozens of points per second while dragging) is what was flooding the
  // backend and crashing the tab. The API is only called once drawing is
  // finished (see App.jsx's completeDrawing) or when a vertex is dragged below.
  const handleAddPoint = (latlng) => {
    const newPoints = [...drawnPoints, [latlng.lat, latlng.lng]];
    setDrawnPoints(newPoints);
  };

  // Close a 'shape' polygon, or finish a 'straight' route (dblclick).
  // Also local-state only — App.jsx's completeDrawing button sends it to the API.
  const handleCloseShape = () => {
    if (drawMode === 'shape') {
      setIsShapeClosed?.(true);
    }
    // For 'straight' mode, dblclick just stops adding points — nothing else to do.
  };

  // Handle marker drag to adjust route vertex (What-if simulation)
  const handleMarkerDragEnd = (index, e) => {
    const latlng = e.target.getLatLng();
    const newPoints = [...drawnPoints];
    newPoints[index] = [latlng.lat, latlng.lng];
    setDrawnPoints(newPoints);
    emitPathChange(newPoints, isShapeClosed);
  };

  // Convert GeoJSON coordinate structure to Leaflet [lat, lon] structure
  const getCoordsFromGeoJSON = (geojsonGeom) => {
    if (!geojsonGeom) return [];
    if (geojsonGeom.type === "Polygon") {
      return geojsonGeom.coordinates[0].map(coord => [coord[1], coord[0]]);
    }
    if (geojsonGeom.type === "LineString") {
      return geojsonGeom.coordinates.map(coord => [coord[1], coord[0]]);
    }
    if (geojsonGeom.type === "Point") {
      return [geojsonGeom.coordinates[1], geojsonGeom.coordinates[0]];
    }
    return [];
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        style={{ background: "#0f172a" }} // Slate-900 fallback
        // Disable Leaflet's own drag-to-pan while in freehand mode so dragging
        // the mouse draws a route instead of panning the map.
        dragging={drawMode !== 'freehand'}
        doubleClickZoom={drawMode !== 'straight'}
      >
        <TileLayer
          key={basemap} // force re-mount when switching so tiles don't mix
          attribution={
            basemap === 'satellite'
              ? 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
          url={
            basemap === 'satellite'
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          }
        />

        {/* Lightweight labels-only overlay (place names, roads) for the satellite view.
            These are small transparent text tiles, not full images, so they're cheap
            to load — unlike the earlier full Esri reference layer that caused lag. */}
        {basemap === 'satellite' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution="&copy; <a href='https://carto.com/attributions'>CARTO</a>"
            pane="shadowPane" // renders above the satellite imagery
          />
        )}

        {/* Map Drawing Click/Drag Handler */}
        <MapEvents
          drawMode={drawMode}
          drawnPoints={drawnPoints}
          onAddPoint={handleAddPoint}
          onCloseShape={handleCloseShape}
        />

        {/* ================= ENVIRONMENTAL LAYERS ================= */}
        {/* Protected Core Areas (High Alert) */}
        {visibleLayers.protected && layers.protected && layers.protected.features.map((feature, i) => (
          <Polygon
            key={`prot-${i}`}
            positions={getCoordsFromGeoJSON(feature.geometry)}
            pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.35, color: '#ef4444', weight: 1.5 }}
          >
            <Tooltip sticky>
              <div className="text-xs font-semibold text-slate-100">
                ⚠️ {feature.properties.name} (Strict Protected Area)
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Forests */}
        {visibleLayers.forests && layers.forests && layers.forests.features.map((feature, i) => (
          <Polygon
            key={`forest-${i}`}
            positions={getCoordsFromGeoJSON(feature.geometry)}
            pathOptions={{ fillColor: '#10b981', fillOpacity: 0.25, color: '#059669', weight: 1.2 }}
          >
            <Tooltip sticky>
              <div className="text-xs text-slate-100">🌲 {feature.properties.name}</div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Wildlife Corridors */}
        {visibleLayers.corridors && layers.corridors && layers.corridors.features.map((feature, i) => (
          <Polygon
            key={`corr-${i}`}
            positions={getCoordsFromGeoJSON(feature.geometry)}
            pathOptions={{ fillColor: '#8b5cf6', fillOpacity: 0.2, color: '#7c3aed', weight: 1.5, dashArray: "4, 4" }}
          >
            <Tooltip sticky>
              <div className="text-xs text-slate-100">🐅 {feature.properties.name} ({feature.properties.criticality} Priority)</div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Water Bodies (Rivers and Lakes) */}
        {visibleLayers.water && layers.water && layers.water.features.map((feature, i) => {
          const coords = getCoordsFromGeoJSON(feature.geometry);
          if (feature.geometry.type === "LineString") {
            return (
              <Polyline
                key={`water-ln-${i}`}
                positions={coords}
                pathOptions={{ color: '#0284c7', weight: 3.5 }}
              >
                <Tooltip sticky>
                  <div className="text-xs text-slate-100">💧 {feature.properties.name}</div>
                </Tooltip>
              </Polyline>
            );
          } else {
            return (
              <Polygon
                key={`water-pl-${i}`}
                positions={coords}
                pathOptions={{ fillColor: '#0284c7', fillOpacity: 0.4, color: '#0369a1', weight: 1.5 }}
              >
                <Tooltip sticky>
                  <div className="text-xs text-slate-100">💧 {feature.properties.name}</div>
                </Tooltip>
              </Polygon>
            );
          }
        })}

        {/* Existing Infrastructure (NH44) */}
        {visibleLayers.roads && layers.roads && layers.roads.features.map((feature, i) => (
          <Polyline
            key={`road-${i}`}
            positions={getCoordsFromGeoJSON(feature.geometry)}
            pathOptions={{ color: '#64748b', weight: 3.5, dashArray: "5, 8" }}
          >
            <Tooltip sticky>
              <div className="text-xs text-slate-300">🛣️ {feature.properties.name}</div>
            </Tooltip>
          </Polyline>
        ))}

        {/* Villages */}
        {visibleLayers.villages && layers.villages && layers.villages.features.map((feature, i) => (
          <CircleMarker
            key={`village-${i}`}
            center={getCoordsFromGeoJSON(feature.geometry)}
            radius={6.5}
            pathOptions={{ fillColor: '#f59e0b', fillOpacity: 0.8, color: '#d97706', weight: 1.5 }}
          >
            <Tooltip sticky>
              <div className="text-xs text-slate-900 font-semibold">
                🏡 {feature.properties.name} (Pop: {feature.properties.population})
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* ================= DRAWN PROPOSED ROUTE ================= */}
        {/* Renders as a closed Polygon once a 'shape' has been closed, otherwise as a Polyline (straight or freehand/curvy) */}
        {drawnPoints.length > 0 && (
          isShapeClosed ? (
            <Polygon
              positions={drawnPoints}
              pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 4 }}
            />
          ) : (
            <Polyline
              positions={drawnPoints}
              pathOptions={{ color: '#f97316', weight: 5, dashArray: drawMode ? "5, 5" : null }}
              smoothFactor={drawMode === 'freehand' ? 3 : 1} // smooths the curvy freehand line a bit
            />
          )
        )}

        {/* Vertex manipulation markers (Allows What-if simulation by dragging) — hidden during freehand drawing since there'd be too many */}
        {drawMode !== 'freehand' && drawnPoints.map((pt, idx) => {
          const customMarkerHtml = `<div class="w-5 h-5 bg-orange-500 rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-orange-600 transition-colors flex items-center justify-center text-[9px] text-white font-extrabold">${idx + 1}</div>`;
          const customIcon = L.divIcon({
            html: customMarkerHtml,
            className: 'custom-div-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          return (
            <Marker
              key={`vertex-${idx}`}
              position={pt}
              draggable={true}
              icon={customIcon}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(idx, e),
              }}
            >
              <Tooltip permanent={false}>
                <div className="text-xs">Vertex {idx + 1} (Drag to adjust path)</div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* ================= ALTERNATIVE ROUTES ================= */}
        {/* Render generated alternatives if not drawing */}
        {!drawMode && alternativeRoutes && alternativeRoutes.map((route) => {
          const isSelected = activeRouteId === route.id;
          const routeCoords = route.coordinates.map(pt => [pt[1], pt[0]]);
          
          let color = '#94a3b8'; // default shortest
          if (route.id === 'recommended') color = '#10b981'; // emerald for recommended
          if (route.id === 'balanced') color = '#ec4899'; // magenta for balanced
          if (route.id === 'shortest') color = '#ef4444'; // red for shortest

          return (
            <Polyline
              key={`alt-route-${route.id}`}
              positions={routeCoords}
              pathOptions={{
                color: color,
                weight: isSelected ? 5.5 : 2.5,
                opacity: isSelected ? 0.95 : 0.45,
                dashArray: route.id === 'shortest' ? "5, 5" : null
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-semibold">
                  {route.name} (Score: {route.analysis.ecological_score})
                </div>
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>
      
      {/* Visual map legend overlay */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-lg text-slate-300 text-xs shadow-lg space-y-2 z-[1000] pointer-events-auto max-w-[200px]">
        <div className="font-bold text-slate-100 border-b border-slate-700 pb-1">Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500"></span>
          <span>Core Protected Area</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></span>
          <span>Forest Reserve</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-violet-500/30 border border-violet-500 border-dashed"></span>
          <span>Wildlife Corridor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-sky-500 inline-block"></span>
          <span>River / Reservoir</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>
          <span>Existing Roads (NH44 / NH53 / SH9)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600 inline-block"></span>
          <span>Village Communities</span>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-700 pt-1 mt-1">
          <span className="w-3 h-1 bg-orange-500 inline-block"></span>
          <span>Proposed Route</span>
        </div>
      </div>
      
      <button
        onClick={() => setIsModalOpen(true)}
        className="absolute top-4 left-4 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-sm border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded text-slate-350 text-[10px] font-bold shadow z-[1000] cursor-pointer pointer-events-auto transition flex items-center gap-1 active:scale-95"
      >
        <span>ℹ️ View GIS Data Sources</span>
      </button>

      <button
        onClick={() => setBasemap(basemap === 'satellite' ? 'dark' : 'satellite')}
        className="absolute top-4 left-[220px] bg-slate-900/90 hover:bg-slate-800 backdrop-blur-sm border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded text-slate-350 text-[10px] font-bold shadow z-[1000] cursor-pointer pointer-events-auto transition flex items-center gap-1 active:scale-95"
      >
        <span>{basemap === 'satellite' ? '🌙 Switch to Dark Map' : '🛰️ Switch to Satellite'}</span>
      </button>

      {/* Glassmorphic Modal for GIS Sources */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-md z-[2000] flex items-center justify-center p-6 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900/95 border border-slate-700/80 max-w-xl w-full max-h-[85%] rounded-xl shadow-2xl p-5 flex flex-col justify-between text-slate-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  🗺️ Nagpur Division GIS Data Catalog
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-300 hover:text-slate-100 text-[10px] font-bold bg-slate-850 hover:bg-slate-800 border border-slate-700 px-2 py-0.5 rounded transition cursor-pointer"
                >
                  Close
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[280px] pr-1 space-y-3 text-[11px] text-left">
                <p className="text-slate-400 leading-normal text-[10px]">
                  Aranyam integrates geographic data of forests, tiger reserves, eco-sensitive zones, and infrastructure for the Nagpur Division. Below is the catalog of official GIS sources and spatial datasets referenced:
                </p>
                
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-350 font-bold">
                        <th className="px-2 py-1.5 text-left w-1/4">Layer</th>
                        <th className="px-2 py-1.5 text-left w-1/3">Region / Cover</th>
                        <th className="px-2 py-1.5 text-left">Official GIS Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-emerald-400">Pench Tiger Reserve</td>
                        <td className="px-2 py-1.5 text-slate-350">Ramtek, Nagpur (Core & Buffer)</td>
                        <td className="px-2 py-1.5 text-slate-300">National Tiger Conservation Authority (NTCA) / WII</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-emerald-400">Bor Tiger Reserve</td>
                        <td className="px-2 py-1.5 text-slate-350">Wardha & Nagpur Border</td>
                        <td className="px-2 py-1.5 text-slate-300">NTCA / Wardha Forest Division / WII</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-emerald-400">Umred Karhandla</td>
                        <td className="px-2 py-1.5 text-slate-350">Nagpur & Bhandara borders</td>
                        <td className="px-2 py-1.5 text-slate-300">Maharashtra Forest Department / MRSAC</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-emerald-400">Mansinghdeo Sanctuary</td>
                        <td className="px-2 py-1.5 text-slate-350">Ramtek, Nagpur</td>
                        <td className="px-2 py-1.5 text-slate-300">MoEFCC Eco-Sensitive Zone Gazette / WII</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-emerald-400">Urban Reserve Forests</td>
                        <td className="px-2 py-1.5 text-slate-350">Gorewada, Ambazari, Seminary Hills</td>
                        <td className="px-2 py-1.5 text-slate-300">Maharashtra Remote Sensing Applications Centre</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-violet-400">Wildlife Corridors</td>
                        <td className="px-2 py-1.5 text-slate-350">Central India Pathways</td>
                        <td className="px-2 py-1.5 text-slate-300">WII Tiger Corridor Atlas</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-sky-400">Hydrology (Water)</td>
                        <td className="px-2 py-1.5 text-slate-350">Rivers (Pench, Wainganga), Reservoirs</td>
                        <td className="px-2 py-1.5 text-slate-300">India-WRIS / NRSC Bhuvan (ISRO)</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-slate-400">Transport Networks</td>
                        <td className="px-2 py-1.5 text-slate-350">Nagpur Highways (NH44, NH53, SH9)</td>
                        <td className="px-2 py-1.5 text-slate-300">NHAI / OpenStreetMap Contributors</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-amber-500">Settlements (Villages)</td>
                        <td className="px-2 py-1.5 text-slate-350">Rural Settlement Hubs</td>
                        <td className="px-2 py-1.5 text-slate-300">Census of India Boundary Datasets / MRSAC</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-800 pt-2 mt-3 text-[9px] text-slate-500 flex justify-between items-center leading-normal">
              <span>🔒 Compiled from official gazettes and open GIS repositories.</span>
              <span className="font-semibold">Coordinates: EPSG:4326</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
