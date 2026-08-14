from app.config import MITIGATION_CATALOG, DEFAULT_WEIGHTS

def get_mitigation_recommendations(analysis_breakdown):
    """
    Returns suggested mitigation measures based on the spatial analysis results.
    """
    suggestions = []
    
    # 1. Corridor crossings
    corridor_len = analysis_breakdown["corridor"]["length_km"]
    if corridor_len > 0:
        units = max(1, int(round(corridor_len / 1.0))) # approx 1 crossing per km of corridor
        cost = units * MITIGATION_CATALOG["wildlife_crossing"]["cost_per_unit"]
        suggestions.append({
            "type": "wildlife_crossing",
            "name": MITIGATION_CATALOG["wildlife_crossing"]["name"],
            "description": MITIGATION_CATALOG["wildlife_crossing"]["description"],
            "units": units,
            "cost_million": round(cost, 2),
            "impact_reduction_pct": int(MITIGATION_CATALOG["wildlife_crossing"]["impact_reduction"] * 100),
            "target": "corridor"
        })
        
    # 2. Water crossings
    water_crossings = analysis_breakdown["water"]["crossings_count"]
    if water_crossings > 0:
        cost = water_crossings * MITIGATION_CATALOG["eco_bridge"]["cost_per_unit"]
        suggestions.append({
            "type": "eco_bridge",
            "name": MITIGATION_CATALOG["eco_bridge"]["name"],
            "description": MITIGATION_CATALOG["eco_bridge"]["description"],
            "units": water_crossings,
            "cost_million": round(cost, 2),
            "impact_reduction_pct": int(MITIGATION_CATALOG["eco_bridge"]["impact_reduction"] * 100),
            "target": "water"
        })

    # 3. Village proximity
    village_len = analysis_breakdown["village"]["length_km"]
    villages_list = analysis_breakdown["village"]["affected_villages"]
    if len(villages_list) > 0:
        units = len(villages_list)
        cost = units * MITIGATION_CATALOG["noise_barrier"]["cost_per_unit"]
        suggestions.append({
            "type": "noise_barrier",
            "name": MITIGATION_CATALOG["noise_barrier"]["name"],
            "description": MITIGATION_CATALOG["noise_barrier"]["description"],
            "units": units,
            "cost_million": round(cost, 2),
            "impact_reduction_pct": int(MITIGATION_CATALOG["noise_barrier"]["impact_reduction"] * 100),
            "target": "village"
        })

    return suggestions

def calculate_mitigated_score(base_analysis, applied_mitigations, custom_weights=None):
    """
    Computes a new ecological score assuming specific mitigation measures are applied.
    """
    weights = custom_weights or DEFAULT_WEIGHTS
    breakdown = base_analysis["breakdown"]
    
    # Extract original scores
    score_forest = breakdown["forest"]["score"]
    score_corridor = breakdown["corridor"]["score"]
    score_water = breakdown["water"]["score"]
    score_fragmentation = breakdown["fragmentation"]["score"]
    score_village = breakdown["village"]["score"]
    
    # Apply reductions
    if "wildlife_crossing" in applied_mitigations:
        reduction = MITIGATION_CATALOG["wildlife_crossing"]["impact_reduction"]
        score_corridor *= (1.0 - reduction)
        
    if "eco_bridge" in applied_mitigations:
        reduction = MITIGATION_CATALOG["eco_bridge"]["impact_reduction"]
        score_water *= (1.0 - reduction)
        
    if "noise_barrier" in applied_mitigations:
        reduction = MITIGATION_CATALOG["noise_barrier"]["impact_reduction"]
        score_village *= (1.0 - reduction)

    # Recalculate weighted score
    raw_eco_score = (
        score_forest * weights["forest"] +
        score_corridor * weights["corridor"] +
        score_water * weights["water"] +
        score_fragmentation * weights["fragmentation"] +
        score_village * weights["village"]
    )
    
    # Maintain core area violation penalty
    penalty = 0.0
    protected_len = base_analysis.get("protected_violation_km", 0.0)
    total_len = base_analysis.get("distance_km", 1.0)
    if protected_len > 0 and total_len > 0:
        penalty = min(30.0, 10.0 + (protected_len / total_len) * 20.0)
        
    return min(100.0, raw_eco_score + penalty)

def optimize_for_budget(routes, budget_limit_million, custom_weights=None):
    """
    Finds the optimal combination of Route + Mitigation Measures that stays
    within the budget and minimizes ecological impact.
    """
    weights = custom_weights or DEFAULT_WEIGHTS
    best_option = None
    
    # Store all evaluated options for comparison in the UI
    all_options = []
    
    for route in routes:
        base_cost = route["analysis"]["construction_cost_million"]
        analysis = route["analysis"]
        
        # Determine applicable mitigations
        applicable = []
        if analysis["breakdown"]["corridor"]["length_km"] > 0:
            applicable.append("wildlife_crossing")
        if analysis["breakdown"]["water"]["crossings_count"] > 0:
            applicable.append("eco_bridge")
        if len(analysis["breakdown"]["village"]["affected_villages"]) > 0:
            applicable.append("noise_barrier")
            
        # Generate power set of mitigations (2^N combinations)
        import itertools
        combos = []
        for r in range(len(applicable) + 1):
            combos.extend(itertools.combinations(applicable, r))
            
        for combo in combos:
            combo_list = list(combo)
            
            # Calculate cost of mitigations
            mitigation_cost = 0.0
            mitigation_details = []
            
            for mit_type in combo_list:
                cat = MITIGATION_CATALOG[mit_type]
                # Determine units
                if mit_type == "wildlife_crossing":
                    units = max(1, int(round(analysis["breakdown"]["corridor"]["length_km"] / 1.0)))
                elif mit_type == "eco_bridge":
                    units = analysis["breakdown"]["water"]["crossings_count"]
                elif mit_type == "noise_barrier":
                    units = len(analysis["breakdown"]["village"]["affected_villages"])
                else:
                    units = 1
                    
                cost = units * cat["cost_per_unit"]
                mitigation_cost += cost
                mitigation_details.append({
                    "type": mit_type,
                    "name": cat["name"],
                    "units": units,
                    "cost_million": round(cost, 2)
                })
                
            total_project_cost = base_cost + mitigation_cost
            mitigated_score = calculate_mitigated_score(analysis, combo_list, custom_weights)
            
            option_data = {
                "route_id": route["id"],
                "route_name": route["name"],
                "base_construction_cost": base_cost,
                "mitigation_cost": round(mitigation_cost, 2),
                "total_cost": round(total_project_cost, 2),
                "original_score": analysis["ecological_score"],
                "mitigated_score": round(mitigated_score, 1),
                "score_reduction_pct": round(max(0.0, (analysis["ecological_score"] - mitigated_score) / (analysis["ecological_score"] or 1) * 100), 1),
                "mitigations": mitigation_details,
                "within_budget": total_project_cost <= budget_limit_million
            }
            
            all_options.append(option_data)
            
            # Select the option that stays within budget and has the lowest ecological score
            if total_project_cost <= budget_limit_million:
                if best_option is None or mitigated_score < best_option["mitigated_score"]:
                    best_option = option_data

    # Sort all options by mitigated score
    all_options.sort(key=lambda x: x["mitigated_score"])
    
    # If no option fits the budget, recommend the absolute cheapest base route
    if best_option is None:
        cheapest_route = min(routes, key=lambda r: r["analysis"]["construction_cost_million"])
        best_option = {
            "route_id": cheapest_route["id"],
            "route_name": cheapest_route["name"],
            "base_construction_cost": cheapest_route["analysis"]["construction_cost_million"],
            "mitigation_cost": 0.0,
            "total_cost": cheapest_route["analysis"]["construction_cost_million"],
            "original_score": cheapest_route["analysis"]["ecological_score"],
            "mitigated_score": cheapest_route["analysis"]["ecological_score"],
            "score_reduction_pct": 0.0,
            "mitigations": [],
            "within_budget": False,
            "error": "No configuration fits the budget. Recommending cheapest base route."
        }

    return {
        "recommended_plan": best_option,
        "all_combinations": all_options
    }
