import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapContainer';
import Dashboard from './components/Dashboard';
import Alternatives from './components/Alternatives';
import MitigationPanel from './components/MitigationPanel';
import { Layers, Activity, Compass, Hammer, Trash2, Pencil, CheckCircle2, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function App() {
  // Map layers
  const [layers, setLayers] = useState({
    forests: null,
    corridors: null,
    water: null,
    roads: null,
    villages: null,
    protected: null
  });

  // UI state
  const [visibleLayers, setVisibleLayers] = useState({
    forests: true,
    corridors: true,
    water: true,
    roads: true,
    villages: true,
    protected: true
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drawing state (coords in Leaflet format: [lat, lon])
  const [drawnPoints, setDrawnPoints] = useState([]);

  // Analysis result state
  const [analysis, setAnalysis] = useState(null);
  const [baselineAnalysis, setBaselineAnalysis] = useState(null); // Used to show Before vs After simulation
  
  // Alternatives state
  const [alternativeRoutes, setAlternativeRoutes] = useState(null);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [hoveredRouteId, setHoveredRouteId] = useState(null);

  // Mitigation suggestions & budget optimization
  const [suggestedMitigations, setSuggestedMitigations] = useState([]);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Fetch GeoJSON layers on mount
  useEffect(() => {
    async function fetchLayers() {
      try {
        const res = await fetch(`${API_BASE}/api/layers`);
        if (!res.ok) throw new Error("Failed to load geographic layers.");
        const data = await res.json();
        setLayers(data);
      } catch (err) {
        console.error(err);
        setError("Could not connect to the geospatial API. Ensure the Python FastAPI server is running on http://localhost:8000.");
      }
    }
    fetchLayers();
  }, []);

  // Handle path geometry modifications (drawing or vertex dragging)
  const handlePathChange = async (geojsonCoords) => {
    if (geojsonCoords.length < 2) return;
    setLoading(true);
    try {
      // 1. Query path analysis
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: geojsonCoords })
      });
      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      
      setAnalysis(result.analysis);
      setSuggestedMitigations(result.suggested_mitigations);
      
      // If we don't have a baseline yet (first draw of the session), set it as baseline
      if (!baselineAnalysis) {
        setBaselineAnalysis(result.analysis);
      }

      // 2. Query alternative paths automatically between the start and end of the drawn path
      const startPoint = geojsonCoords[0];
      const endPoint = geojsonCoords[geojsonCoords.length - 1];
      
      const altRes = await fetch(`${API_BASE}/api/alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: startPoint, end: endPoint })
      });
      if (altRes.ok) {
        const alternatives = await altRes.json();
        setAlternativeRoutes(alternatives);
        
        // Find and select the recommended route by default
        const rec = alternatives.find(r => r.recommended);
        if (rec) {
          setActiveRouteId(rec.id);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error analyzing road path.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle draw mode
  const startDrawing = () => {
    setDrawnPoints([]);
    setAnalysis(null);
    setBaselineAnalysis(null);
    setAlternativeRoutes(null);
    setActiveRouteId(null);
    setSuggestedMitigations([]);
    setOptimizationResult(null);
    setIsDrawMode(true);
  };

  const completeDrawing = () => {
    setIsDrawMode(false);
    if (drawnPoints.length >= 2) {
      const geojsonCoords = drawnPoints.map(pt => [pt[1], pt[0]]);
      handlePathChange(geojsonCoords);
    }
  };

  const clearDrawing = () => {
    setDrawnPoints([]);
    setAnalysis(null);
    setBaselineAnalysis(null);
    setAlternativeRoutes(null);
    setActiveRouteId(null);
    setSuggestedMitigations([]);
    setOptimizationResult(null);
    setIsDrawMode(false);
    setError(null);
  };

  // Trigger budget optimization
  const handleBudgetOptimization = async (budgetLimit) => {
    if (!alternativeRoutes) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routes: alternativeRoutes,
          budget: budgetLimit
        })
      });
      if (!res.ok) throw new Error("Optimization failed");
      const result = await res.json();
      setOptimizationResult(result);
      
      // Update active route on map to be the optimized route choice
      if (result.recommended_plan && result.recommended_plan.route_id) {
        setActiveRouteId(result.recommended_plan.route_id);
        
        // Temporarily overwrite active analysis with the selected route
        const activeRoute = alternativeRoutes.find(r => r.id === result.recommended_plan.route_id);
        if (activeRoute) {
          setAnalysis(activeRoute.analysis);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to calculate optimal budget solution.");
    } finally {
      setLoading(false);
    }
  };

  // Handle alternative route selection
  useEffect(() => {
    if (!activeRouteId || !alternativeRoutes) return;
    const selectedRoute = alternativeRoutes.find(r => r.id === activeRouteId);
    if (selectedRoute) {
      setAnalysis(selectedRoute.analysis);
      
      // Update mitigations based on active route
      async function updateMitigations() {
        try {
          const res = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: selectedRoute.coordinates })
          });
          if (res.ok) {
            const data = await res.json();
            setSuggestedMitigations(data.suggested_mitigations);
          }
        } catch (e) {
          console.error(e);
        }
      }
      updateMitigations();
    }
  }, [activeRouteId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 🚀 Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-slate-100 shadow-md shadow-emerald-500/20">
            A
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-100 leading-none">Aranyam</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Ecological Infrastructure Planner</p>
          </div>
        </div>

        {/* Global Connection/Error Status */}
        <div className="flex items-center gap-4 text-xs">
          {error ? (
            <span className="px-3 py-1 bg-red-950/40 border border-red-900/50 text-red-400 rounded-full font-semibold animate-pulse">
              ⚠️ Offline
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              FastAPI GIS Connected
            </span>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh GIS Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Console Layout */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        
        {/* Left Control Panel / GIS Menu (Sidebar 1) */}
        <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col justify-between shrink-0 p-5 overflow-y-auto">
          <div className="space-y-6">
            
            {/* 📍 A-B Road Design Trigger */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proposed Road Design</h2>
              
              {!isDrawMode ? (
                <button
                  onClick={startDrawing}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-lg font-bold text-xs shadow-lg shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20"
                >
                  <Pencil className="w-4 h-4" />
                  Draw Proposed Road
                </button>
              ) : (
                <button
                  onClick={completeDrawing}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  Complete Route Geometry ({drawnPoints.length} pts)
                </button>
              )}

              {drawnPoints.length > 0 && (
                <button
                  onClick={clearDrawing}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Drawing
                </button>
              )}
            </div>

            {/* 🗺️ Map Layers Toggle (GIS Controls) */}
            <div className="space-y-3 border-t border-slate-800 pt-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Layers className="w-4 h-4 text-slate-400" />
                GIS Map Layers
              </h2>
              
              <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                {Object.keys(visibleLayers).map((layerKey) => (
                  <label key={layerKey} className="flex items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer select-none py-1 hover:text-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleLayers[layerKey]}
                      onChange={() => setVisibleLayers({
                        ...visibleLayers,
                        [layerKey]: !visibleLayers[layerKey]
                      })}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50 w-4 h-4 cursor-pointer focus:ring-offset-0"
                    />
                    <span className="capitalize">{layerKey} Layer</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Helper Instructions */}
            {isDrawMode && (
              <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg text-[10px] text-blue-300 leading-normal">
                💡 <span className="font-semibold text-slate-200">How to draw:</span> Click sequentially on the map to define the road path. When done, click the amber "Complete Route Geometry" button above. You can drag vertices on the map anytime to simulate adjustments.
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-500">
            Aranyam Decision System v1.0.0
          </div>
        </div>

        {/* Middle Map Panel (Primary Content) */}
        <main className="flex-1 min-h-0 bg-slate-950 p-4 relative flex flex-col">
          {error && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-950/90 backdrop-blur-sm border border-red-800 text-red-200 text-xs px-4 py-2.5 rounded-lg shadow-xl z-[9999] max-w-md text-center">
              {error}
            </div>
          )}

          {loading && (
            <div className="absolute top-8 right-8 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow z-[9999] pointer-events-none">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Analyzing spatial data...</span>
            </div>
          )}

          {/* Interactive Map */}
          <div className="flex-1 min-h-0 w-full relative">
            <MapComponent
              layers={layers}
              drawnPoints={drawnPoints}
              setDrawnPoints={setDrawnPoints}
              isDrawMode={isDrawMode}
              activeRouteId={hoveredRouteId || activeRouteId} // Priority to hovered route
              alternativeRoutes={alternativeRoutes}
              visibleLayers={visibleLayers}
              onPathChange={handlePathChange}
            />
          </div>
        </main>

        {/* Right Sidebar Analyser & Dashboard */}
        <div className="w-[450px] border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
          
          {/* Tab Navigation header */}
          <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition ${activeTab === 'dashboard' ? 'text-emerald-400 border-emerald-500 bg-slate-900' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'}`}
            >
              <Activity className="w-4 h-4" />
              Impacts
            </button>
            <button
              onClick={() => setActiveTab('alternatives')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition ${activeTab === 'alternatives' ? 'text-emerald-400 border-emerald-500 bg-slate-900' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'}`}
              disabled={!alternativeRoutes}
              title={!alternativeRoutes ? "Draw a path first to compare alternative alignments" : ""}
            >
              <Compass className="w-4 h-4" />
              Alternatives
            </button>
            <button
              onClick={() => setActiveTab('mitigation')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 border-b-2 transition ${activeTab === 'mitigation' ? 'text-emerald-400 border-emerald-500 bg-slate-900' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'}`}
              disabled={!analysis}
              title={!analysis ? "Draw a path first to plan mitigations" : ""}
            >
              <Hammer className="w-4 h-4" />
              Mitigations
            </button>
          </div>

          {/* Active Tab Panel Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'dashboard' && (
              <Dashboard analysis={analysis} baselineAnalysis={baselineAnalysis} />
            )}
            
            {activeTab === 'alternatives' && (
              <Alternatives
                routes={alternativeRoutes}
                activeRouteId={activeRouteId}
                setActiveRouteId={setActiveRouteId}
                onHoverRoute={setHoveredRouteId}
              />
            )}
            
            {activeTab === 'mitigation' && (
              <MitigationPanel
                analysis={analysis}
                suggestedMitigations={suggestedMitigations}
                onOptimize={handleBudgetOptimization}
                optimizationResult={optimizationResult}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
