import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, Cell } from 'recharts';
import { AlertTriangle, ShieldCheck, TrendingDown, DollarSign, Activity, Trees, Route } from 'lucide-react';

export default function Dashboard({ analysis, baselineAnalysis }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
        <Activity className="w-12 h-12 mb-4 text-emerald-500/80 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-300">Awaiting Road Geometry</h3>
        <p className="max-w-xs mt-2 text-xs">
          Click "Draw Proposed Road" on the left menu and place points on the map to calculate ecological impact.
        </p>
      </div>
    );
  }

  const { ecological_score, distance_km, construction_cost_million, breakdown, protected_violation_km } = analysis;

  // Chart data formatting
  const chartData = [
    { name: 'Forest', score: breakdown.forest.score, weight: '35%' },
    { name: 'Corridor', score: breakdown.corridor.score, weight: '30%' },
    { name: 'Water', score: breakdown.water.score, weight: '15%' },
    { name: 'Fragmentation', score: breakdown.fragmentation.score, weight: '15%' },
    { name: 'Village', score: breakdown.village.score, weight: '5%' }
  ];

  // Colors for chart bars based on category
  const COLORS = ['#10b981', '#8b5cf6', '#0284c7', '#f43f5e', '#f59e0b'];

  // Calculate simulated reduction if baseline exists
  const hasReduction = baselineAnalysis && baselineAnalysis.ecological_score !== ecological_score;
  const beforeScore = baselineAnalysis ? baselineAnalysis.ecological_score : ecological_score;
  const afterScore = ecological_score;
  const scoreDiff = beforeScore - afterScore;
  const scoreReductionPct = beforeScore > 0 ? (scoreDiff / beforeScore) * 100 : 0;

  const costDiff = baselineAnalysis ? (analysis.construction_cost_million - baselineAnalysis.construction_cost_million) : 0;

  // Rating and color based on score severity
  const getSeverity = (score) => {
    if (score >= 60) return { label: 'High Potential Risk', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' };
    if (score >= 30) return { label: 'Moderate Ecological Risk', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'Low Ecological Risk', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  };

  const severity = getSeverity(ecological_score);

  return (
    <div className="space-y-6">
      {/* ⚠️ Product Disclaimer Banner */}
      <div className="px-4 py-3 bg-slate-900 border border-slate-700/50 rounded-xl text-[11px] text-slate-400 leading-relaxed shadow flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Aranyam Decision Support Tool:</span> This system provides simulations based on local GeoJSON models to aid initial infrastructure design. It does NOT replace a formal Environmental Impact Assessment (EIA) or legal clearance processes. All metrics are estimated potential ecological risks.
        </div>
      </div>

      {/* Main Score & Warning Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gauge Card */}
        <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Ecological Impact Score</h3>
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#1e293b" strokeWidth="8" fill="transparent" />
              {/* Highlight circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={ecological_score >= 60 ? "#ef4444" : ecological_score >= 30 ? "#f59e0b" : "#10b981"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - ecological_score / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-slate-100 tracking-tight">{ecological_score}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Max 100</span>
            </div>
          </div>
          <div className={`mt-4 px-3 py-1 rounded text-xs font-semibold ${severity.bg} ${severity.color}`}>
            {severity.label}
          </div>
        </div>

        {/* Protected Area Warning or Highlight Card */}
        <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">Critical Warnings</h3>
            {protected_violation_km > 0 ? (
              <div className="p-3.5 bg-red-950/40 border border-red-800/40 rounded-lg flex gap-3 text-red-200">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Tiger Reserve Core Violation</p>
                  <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                    The proposed path intersects {protected_violation_km} km of protected core sanctuary areas, violating:{" "}
                    <span className="font-semibold text-red-400">
                      {analysis.violated_protected_areas && analysis.violated_protected_areas.length > 0
                        ? analysis.violated_protected_areas.map(v => `${v.name} (${v.length_km} km)`).join(', ')
                        : 'Core Protected Zone'}
                    </span>
                    . This triggers legal blockages and high ecological penalties. Please adjust alignment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex gap-3 text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Protected Area Intact</p>
                  <p className="mt-1 text-slate-300 text-[11px]">
                    No intersections detected inside any core wildlife sanctuary zone (Pench, Mansinghdeo, Bor, or Umred Karhandla). Connectivity is preserved.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Stats Grid inside */}
          <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-800 pt-4">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">EST. COST</span>
              <span className="text-lg font-bold text-slate-200">₹{construction_cost_million} Cr</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">TOTAL LENGTH</span>
              <span className="text-lg font-bold text-slate-200">{distance_km} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔄 What-If Simulation Comparison (Shown when changes occur) */}
      {baselineAnalysis && (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-200 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              What-If Simulation Results
            </h3>
            <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase tracking-widest font-bold">Real-time</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Score Simulation */}
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">ECOLOGICAL IMPACT</span>
              <div className="flex items-center justify-center gap-2 font-mono">
                <span className="text-slate-400 line-through text-sm">{beforeScore}</span>
                <span className="text-slate-400 text-xs">→</span>
                <span className={`font-bold text-base ${scoreDiff > 0 ? 'text-emerald-400' : scoreDiff < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                  {afterScore}
                </span>
              </div>
            </div>

            {/* Impact Reduction */}
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-400 block mb-1">IMPACT REDUCTION</span>
              {scoreDiff > 0 ? (
                <div className="flex items-center gap-1 text-emerald-400 font-bold text-base">
                  <TrendingDown className="w-4 h-4" />
                  <span>{scoreReductionPct.toFixed(1)}%</span>
                </div>
              ) : scoreDiff < 0 ? (
                <div className="text-red-400 font-bold text-sm">
                  +{Math.abs(scoreReductionPct).toFixed(1)}% (Increase)
                </div>
              ) : (
                <span className="text-slate-400 text-xs font-semibold">No Change</span>
              )}
            </div>

            {/* Budget Difference */}
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">COST VARIATION</span>
              <div className="flex items-center justify-center gap-1 text-slate-200 font-mono text-sm font-bold">
                {costDiff > 0 ? (
                  <span className="text-red-400">+₹{costDiff.toFixed(2)} Cr</span>
                ) : costDiff < 0 ? (
                  <span className="text-emerald-400">-₹{Math.abs(costDiff).toFixed(2)} Cr</span>
                ) : (
                  <span className="text-slate-400 text-xs">No cost change</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Environmental Metrics */}
      <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-lg">
        <h3 className="text-xs uppercase tracking-wider text-slate-200 font-bold mb-4">Spatial Intersection Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {/* Forest affected */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-center flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-widest mb-2 block">Forest Impact</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{breakdown.forest.affected_area_ha}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">hectares affected</div>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 border-t border-slate-900 pt-1.5 font-mono">
              {breakdown.forest.length_km} km in forest
            </div>
          </div>

          {/* Corridor length */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-center flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-widest mb-2 block">Corridor Cross</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{breakdown.corridor.length_km} km</div>
              <div className="text-[9px] text-slate-400 mt-0.5">inside tiger corridor</div>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 border-t border-slate-900 pt-1.5 font-mono">
              Score: {breakdown.corridor.score}
            </div>
          </div>

          {/* Water crossings */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-center flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-sky-400 uppercase tracking-widest mb-2 block">Water crossing</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{breakdown.water.crossings_count}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">rivers/lakes crossed</div>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 border-t border-slate-900 pt-1.5 font-mono">
              Score: {breakdown.water.score}
            </div>
          </div>

          {/* Fragmentation */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-center flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-rose-400 uppercase tracking-widest mb-2 block">Fragmentation</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{breakdown.fragmentation.score}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">index score (0-100)</div>
            </div>
            <div className="text-[9px] text-slate-400 mt-2 border-t border-slate-900 pt-1.5 font-mono">
              {breakdown.fragmentation.pristine_km} km far from NH44
            </div>
          </div>

          {/* Villages */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-center flex flex-col justify-between">
            <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-widest mb-2 block">Village Proximity</span>
            <div>
              <div className="text-lg font-bold text-slate-100">{breakdown.village.affected_villages.length}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">within 500m zone</div>
            </div>
            <div className="text-[9px] text-slate-300 mt-2 border-t border-slate-900 pt-1.5 truncate max-w-full">
              {breakdown.village.affected_villages.join(', ') || 'None'}
            </div>
          </div>
        </div>

        {((breakdown.forest.details && breakdown.forest.details.length > 0) || 
          (breakdown.corridor.details && breakdown.corridor.details.length > 0)) && (
          <div className="mt-4 pt-3 border-t border-slate-850 text-[11px] text-slate-350 space-y-2 text-left">
            {breakdown.forest.details && breakdown.forest.details.length > 0 && (
              <div className="leading-relaxed">
                <span className="font-semibold text-emerald-400">🌲 Forests Intersected:</span>{" "}
                {breakdown.forest.details.map(d => `${d.name} (${d.length_km} km)`).join(', ')}
              </div>
            )}
            {breakdown.corridor.details && breakdown.corridor.details.length > 0 && (
              <div className="leading-relaxed">
                <span className="font-semibold text-violet-400">🐅 Corridors Intersected:</span>{" "}
                {breakdown.corridor.details.map(d => `${d.name} (${d.length_km} km, ${d.criticality} Priority)`).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recharts Chart for visualization */}
      <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-200 font-bold">Ecological Cost Drivers</h3>
          <span className="text-[10px] text-slate-400">Values represent raw percentage-impact before weighting</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <ChartTooltip
                cursor={{ fill: '#1e293b', opacity: 0.2 }}
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
