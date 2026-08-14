import React, { useState } from 'react';
import { IndianRupee, ShieldAlert, Sparkles, ChevronRight, CheckCircle, HelpCircle } from 'lucide-react';

export default function MitigationPanel({
  analysis,
  suggestedMitigations,
  onOptimize,
  optimizationResult
}) {
  const [budget, setBudget] = useState(15.0); // Default budget in Crores

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
        <IndianRupee className="w-12 h-12 mb-3 text-slate-500/80" />
        <h3 className="text-sm font-bold text-slate-300">Mitigation Planner Locked</h3>
        <p className="max-w-xs mt-1 text-[11px]">
          Calculate ecological impacts for a route to view site-specific mitigation measures and optimization recommendations.
        </p>
      </div>
    );
  }

  // Calculate base construction cost of active path
  const baseCost = analysis.construction_cost_million;

  const handleOptimizeClick = () => {
    if (onOptimize) {
      onOptimize(budget);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Rule-based mitigation suggestions */}
      <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
          <h3 className="text-xs uppercase tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Recommended Mitigation Plan
          </h3>
          <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase tracking-widest font-bold">Rule-Based</span>
        </div>

        {suggestedMitigations && suggestedMitigations.length > 0 ? (
          <div className="space-y-3">
            {suggestedMitigations.map((item, idx) => (
              <div key={idx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                  <div className="flex gap-2.5 mt-2 text-[9px] font-semibold">
                    <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
                      -{item.impact_reduction_pct}% {item.target} risk
                    </span>
                    <span className="text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded">
                      Qty: {item.units} unit{item.units > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-slate-100">₹{item.cost_million.toFixed(2)} Cr</div>
                  <div className="text-[8px] text-slate-500 uppercase mt-0.5">Estimated Cost</div>
                </div>
              </div>
            ))}

            {/* Total mitigations summation */}
            <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400">Total Mitigation Premium:</span>
              <span className="text-slate-200">
                ₹{suggestedMitigations.reduce((acc, item) => acc + item.cost_million, 0).toFixed(2)} Cr
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400 bg-slate-950/30 rounded-lg">
            🍀 No urgent mitigation measures required for this path!
          </div>
        )}
      </div>

      {/* 2. Budget optimization controls */}
      <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="text-xs uppercase tracking-wider text-slate-200 font-bold flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-amber-500" />
            Budget Optimization
          </h3>
          <span className="text-[9px] bg-slate-850 px-2 py-0.5 rounded text-amber-400 uppercase tracking-widest font-bold">Optimizer</span>
        </div>
        
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Input your total project budget (covering road construction + ecological mitigations). The algorithm will select the ideal route configuration and mitigation mix.
        </p>

        {/* Budget Input Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold">Total Budget Limit:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">₹{budget.toFixed(1)} Cr INR</span>
          </div>
          <input
            type="range"
            min={Math.max(2.0, Math.floor(baseCost * 0.5))}
            max={Math.ceil(baseCost * 3.5)}
            step="0.5"
            value={budget}
            onChange={(e) => setBudget(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>₹{(Math.max(2.0, Math.floor(baseCost * 0.5))).toFixed(1)} Cr</span>
            <span>Current road cost: ₹{baseCost.toFixed(1)} Cr</span>
            <span>₹{(Math.ceil(baseCost * 3.5)).toFixed(1)} Cr</span>
          </div>
        </div>

        <button
          onClick={handleOptimizeClick}
          className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-100 font-bold text-xs rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
        >
          Compute Budget-Optimal Plan
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Budget Optimization results */}
      {optimizationResult && (
        <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-lg border-l-4 border-l-emerald-500 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Optimized Solution Reached
            </h4>
            <span className="text-[9px] text-slate-400 font-mono font-semibold">
              Budget Limit: ₹{budget.toFixed(1)} Cr
            </span>
          </div>

          {optimizationResult.recommended_plan.error ? (
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-[10px] text-red-400 leading-normal">
              ⚠️ {optimizationResult.recommended_plan.error}
              <div className="mt-2 text-slate-300 font-medium">
                Selected Path: <span className="font-bold text-slate-100">{optimizationResult.recommended_plan.route_name}</span>
                <br />
                Total Cost: ₹{optimizationResult.recommended_plan.total_cost.toFixed(2)} Cr
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Route Recommendation */}
              <div className="text-xs">
                <span className="text-slate-400">Selected Infrastructure Alignment:</span>
                <div className="font-bold text-slate-100 text-sm mt-0.5">
                  {optimizationResult.recommended_plan.route_name}
                </div>
              </div>

              {/* Score Reduction display */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3 rounded-lg border border-slate-850">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Mitigated Score</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-mono text-[10px] line-through">
                      {optimizationResult.recommended_plan.original_score}
                    </span>
                    <span className="text-emerald-400 font-extrabold text-base">
                      {optimizationResult.recommended_plan.mitigated_score}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Impact Reduction</span>
                  <span className="text-emerald-400 font-extrabold text-base block mt-0.5">
                    -{optimizationResult.recommended_plan.score_reduction_pct}%
                  </span>
                </div>
              </div>

              {/* Applied Mitigations list */}
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold mb-2">Required Mitigations:</span>
                {optimizationResult.recommended_plan.mitigations.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {optimizationResult.recommended_plan.mitigations.map((mit, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] bg-slate-950 p-2 rounded border border-slate-850">
                        <span className="text-slate-300">
                          🛠️ {mit.name} (x{mit.units})
                        </span>
                        <span className="font-mono text-slate-100">₹{mit.cost_million.toFixed(2)} Cr</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 bg-slate-950 p-2 rounded text-center border border-slate-850">
                    No mitigation packages recommended.
                  </div>
                )}
              </div>

              {/* Cost Summary block */}
              <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Total Cost Breakdown</span>
                  <span className="text-[10px] text-slate-500">
                    Base: ₹{optimizationResult.recommended_plan.base_construction_cost} Cr + Mitigate: ₹{optimizationResult.recommended_plan.mitigation_cost} Cr
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-slate-200">
                    ₹{optimizationResult.recommended_plan.total_cost.toFixed(2)} Cr
                  </div>
                  <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/30">
                    Under Budget
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
