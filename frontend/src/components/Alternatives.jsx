import React from 'react';
import { Check, Compass, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Alternatives({
  routes,
  activeRouteId,
  setActiveRouteId,
  onHoverRoute
}) {
  if (!routes || routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
        <Compass className="w-12 h-12 mb-3 text-slate-500/80 animate-spin" style={{ animationDuration: '6s' }} />
        <h3 className="text-sm font-bold text-slate-300">No Alternatives Generated</h3>
        <p className="max-w-xs mt-1 text-[11px]">
          Enter your start/end points or draw a proposed road first to view recommended alternative paths.
        </p>
      </div>
    );
  }

  // Find recommended route to list first or showcase
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.recommended) return -1;
    if (b.recommended) return 1;
    return a.analysis.ecological_score - b.analysis.ecological_score;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <h3 className="text-xs uppercase tracking-wider text-slate-300 font-bold">Route Comparisons</h3>
        <span className="text-[10px] text-emerald-400 font-medium">3 paths computed</span>
      </div>

      <div className="space-y-3">
        {sortedRoutes.map((route) => {
          const isSelected = activeRouteId === route.id;
          const { ecological_score, distance_km, construction_cost_million, breakdown, protected_violation_km } = route.analysis;
          
          let cardBorderColor = "border-slate-800 hover:border-slate-700";
          let scoreBadgeBg = "bg-slate-800 text-slate-300";
          
          if (isSelected) {
            if (route.id === 'recommended') {
              cardBorderColor = "border-emerald-500 ring-1 ring-emerald-500/30";
              scoreBadgeBg = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
            } else if (route.id === 'balanced') {
              cardBorderColor = "border-pink-500 ring-1 ring-pink-500/30";
              scoreBadgeBg = "bg-pink-500/20 text-pink-300 border border-pink-500/30";
            } else {
              cardBorderColor = "border-red-500 ring-1 ring-red-500/30";
              scoreBadgeBg = "bg-red-500/20 text-red-300 border border-red-500/30";
            }
          }

          return (
            <div
              key={route.id}
              className={`bg-slate-900 border ${cardBorderColor} p-4 rounded-xl transition-all duration-300 cursor-pointer shadow-md select-none`}
              onClick={() => setActiveRouteId(route.id)}
              onMouseEnter={() => onHoverRoute && onHoverRoute(route.id)}
              onMouseLeave={() => onHoverRoute && onHoverRoute(null)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-100">{route.name}</h4>
                    {route.recommended && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 rounded text-[9px] font-bold uppercase tracking-wide">
                        RECOMMENDED
                      </span>
                    )}
                    {route.id === 'shortest' && (
                      <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-800/40 rounded text-[9px] font-bold uppercase tracking-wide">
                        Cheapest Base
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal line-clamp-2">
                    {route.description}
                  </p>
                </div>
                
                {/* Score badge */}
                <div className={`px-2.5 py-1.5 rounded-lg text-center ${scoreBadgeBg}`}>
                  <div className="text-[8px] uppercase tracking-wider font-semibold">Score</div>
                  <div className="text-base font-extrabold leading-none mt-0.5">{ecological_score}</div>
                </div>
              </div>

              {/* Warnings (Protected Area Core Violations) */}
              {protected_violation_km > 0 && (
                <div className="mb-3 px-2 py-1 bg-red-950/20 border border-red-900/30 rounded text-[9px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Intersects {protected_violation_km} km of:{" "}
                    {route.analysis.violated_protected_areas && route.analysis.violated_protected_areas.length > 0
                      ? route.analysis.violated_protected_areas.map(v => v.name).join(', ')
                      : 'Core Protected Zone'}
                  </span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-3 text-xs">
                {/* Length */}
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Distance</span>
                  <span className="font-semibold text-slate-300">{distance_km} km</span>
                </div>

                {/* Cost */}
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Const. Cost</span>
                  <span className="font-semibold text-slate-300">₹{construction_cost_million} Cr</span>
                </div>

                {/* Overlap Summary */}
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Intersections</span>
                  <span className="font-semibold text-slate-300">
                    {breakdown.forest.length_km} km forest
                  </span>
                </div>
              </div>

              {/* Select indicator */}
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/40 pt-2">
                <span>Hover to isolate | Click to select</span>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Check className="w-3 h-3" />
                    <span>Active Route</span>
                  </span>
                ) : (
                  <span className="text-slate-400 hover:text-slate-200">Select Path</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
