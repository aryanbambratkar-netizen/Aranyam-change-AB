import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issues in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map click listener component
function MapEvents({ isDrawMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isDrawMode) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export default function MapComponent({
  layers,
  drawnPoints,
  setDrawnPoints,
  isDrawMode,
  activeRouteId,
  alternativeRoutes,
  visibleLayers,
  onPathChange
}) {
  const defaultCenter = [21.48, 79.25]; // Pench/Nagpur region center
  const defaultZoom = 10;

  // Handle adding a point to the road path
  const handleMapClick = (latlng) => {
    const newPoints = [...drawnPoints, [latlng.lat, latlng.lng]];
    setDrawnPoints(newPoints);
    if (onPathChange) {
      // Send GeoJSON format [lon, lat] to parent for API analysis
      const geojsonCoords = newPoints.map(pt => [pt[1], pt[0]]);
      onPathChange(geojsonCoords);
    }
  };

  // Handle marker drag to adjust route vertex (What-if simulation)
  const handleMarkerDragEnd = (index, e) => {
    const latlng = e.target.getLatLng();
    const newPoints = [...drawnPoints];
    newPoints[index] = [latlng.lat, latlng.lng];
    setDrawnPoints(newPoints);
    if (onPathChange) {
      const geojsonCoords = newPoints.map(pt => [pt[1], pt[0]]);
      onPathChange(geojsonCoords);
    }
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
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme maps look premium
        />

        {/* Map Drawing Click Handler */}
        <MapEvents isDrawMode={isDrawMode} onMapClick={handleMapClick} />

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
        {drawnPoints.length > 0 && (
          <Polyline
            positions={drawnPoints}
            pathOptions={{ color: '#f97316', weight: 5, dashArray: isDrawMode ? "5, 5" : null }}
          />
        )}

        {/* Vertex manipulation markers (Allows What-if simulation by dragging) */}
        {drawnPoints.map((pt, idx) => {
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
        {!isDrawMode && alternativeRoutes && alternativeRoutes.map((route) => {
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
          <span>Existing Road (NH44)</span>
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
      
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-3 py-1 rounded text-slate-400 text-[10px] shadow z-[1000]">
        ℹ️ GIS Source: Nagpur/Pench Buffer Zone Simulation Data
      </div>
    </div>
  );
}
