# Default ecological scoring weights (must sum to 1.0)
DEFAULT_WEIGHTS = {
    "forest": 0.35,
    "corridor": 0.30,
    "water": 0.15,
    "fragmentation": 0.15,
    "village": 0.05
}

# Buffer sizes (in meters) for calculating spatial intersections
BUFFER_SIZES = {
    "forest_affected_buffer": 50,        # 50m buffer on each side (100m total impact zone)
    "village_proximity_buffer": 500,     # 500m buffer to determine impact on village community
    "water_crossing_buffer": 20,         # 20m buffer to detect stream/river intersection
    "corridor_affected_buffer": 50       # 50m buffer inside wildlife corridor
}

# Project cost coefficients (in million USD/Rupees per km or unit crossing)
COST_COEFFICIENTS = {
    "base_road_cost_per_km": 1.2,          # Base construction cost per km
    "forest_crossing_premium_per_km": 0.8, # Extra cost per km when building inside forests
    "corridor_crossing_premium_per_km": 1.0, # Extra cost per km when building in wildlife corridors
    "water_crossing_bridge_cost": 2.5       # Cost per water crossing (bridge/elevated deck)
}

# Mitigation Measures
MITIGATION_CATALOG = {
    "wildlife_crossing": {
        "name": "Eco-Duct / Wildlife Underpass",
        "description": "Constructed animal crossings to maintain ecological connectivity.",
        "cost_per_unit": 1.5, # Million
        "impact_reduction": 0.80, # Reduces corridor impact by 80%
        "applies_to": "corridor"
    },
    "eco_bridge": {
        "name": "Eco-Bridge / Canopy Crossing",
        "description": "Elevated road structure or specialized bridge for rivers/canopies.",
        "cost_per_unit": 2.0, # Million
        "impact_reduction": 0.90, # Reduces water crossing impact by 90%
        "applies_to": "water"
    },
    "noise_barrier": {
        "name": "Acoustic Noise Barriers & Speed Gates",
        "description": "Soundproofing panels and smart lighting to minimize village disturbance.",
        "cost_per_unit": 0.4, # Million
        "impact_reduction": 0.70, # Reduces village proximity impact by 70%
        "applies_to": "village"
    }
}
