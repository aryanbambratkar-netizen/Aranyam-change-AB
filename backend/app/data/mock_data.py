import geojson

# Bounding box of Pench/Nagpur region: 
# Latitude: 21.1 (Nagpur) to 21.8 (Pench Core)
# Longitude: 79.0 to 79.5

def create_forests():
    # North Pench Forest Block (Core + Buffer)
    pench_forest = geojson.Polygon([[
        [79.20, 21.60],
        [79.45, 21.60],
        [79.48, 21.80],
        [79.18, 21.80],
        [79.20, 21.60]
    ]])
    
    # South Mansar Reserve Forest
    mansar_forest = geojson.Polygon([[
        [79.15, 21.30],
        [79.32, 21.30],
        [79.30, 21.45],
        [79.13, 21.45],
        [79.15, 21.30]
    ]])

    # East Ramtek Forest
    ramtek_forest = geojson.Polygon([[
        [79.35, 21.35],
        [79.48, 21.35],
        [79.47, 21.50],
        [79.34, 21.48],
        [79.35, 21.35]
    ]])

    features = [
        geojson.Feature(geometry=pench_forest, properties={"id": "forest_pench", "name": "Pench Tiger Reserve Buffer Forest", "type": "Forest"}),
        geojson.Feature(geometry=mansar_forest, properties={"id": "forest_mansar", "name": "Mansar Reserve Forest", "type": "Forest"}),
        geojson.Feature(geometry=ramtek_forest, properties={"id": "forest_ramtek", "name": "Ramtek Forest Range", "type": "Forest"})
    ]
    return geojson.FeatureCollection(features)

def create_corridors():
    # Corridor 1: North-South Corridor connecting Pench buffer to Mansar forest
    ns_corridor = geojson.Polygon([[
        [79.24, 21.45],
        [79.32, 21.45],
        [79.30, 21.60],
        [79.22, 21.60],
        [79.24, 21.45]
    ]])
    
    # Corridor 2: East-West Corridor connecting Mansar forest to Ramtek Forest
    ew_corridor = geojson.Polygon([[
        [79.30, 21.38],
        [79.36, 21.38],
        [79.35, 21.43],
        [79.29, 21.43],
        [79.30, 21.38]
    ]])

    features = [
        geojson.Feature(geometry=ns_corridor, properties={"id": "corr_ns", "name": "Kanha-Pench Corridor Link A", "type": "Corridor", "criticality": "High"}),
        geojson.Feature(geometry=ew_corridor, properties={"id": "corr_ew", "name": "Ramtek-Mansar Connecting Corridor", "type": "Corridor", "criticality": "Medium"})
    ]
    return geojson.FeatureCollection(features)

def create_water():
    # Pench River (Winding Polyline)
    pench_river = geojson.LineString([
        [79.18, 21.80],
        [79.22, 21.72],
        [79.25, 21.68],
        [79.24, 21.60],
        [79.27, 21.52],
        [79.28, 21.40],
        [79.32, 21.25],
        [79.30, 21.15]
    ])

    # Totladoh Reservoir (Lake Polygon)
    totladoh_lake = geojson.Polygon([[
        [79.25, 21.70],
        [79.31, 21.70],
        [79.33, 21.76],
        [79.26, 21.77],
        [79.25, 21.70]
    ]])

    features = [
        geojson.Feature(geometry=pench_river, properties={"id": "water_river", "name": "Pench River", "type": "River"}),
        geojson.Feature(geometry=totladoh_lake, properties={"id": "water_lake", "name": "Totladoh Reservoir", "type": "Reservoir"})
    ]
    return geojson.FeatureCollection(features)

def create_roads():
    # Existing Highway NH44 (North-South arterial road)
    nh44 = geojson.LineString([
        [79.26, 21.15],
        [79.26, 21.30],
        [79.27, 21.39],  # Mansar
        [79.32, 21.56],  # Deolapar
        [79.33, 21.62],  # Sillari
        [79.32, 21.71],  # Khawasa
        [79.31, 21.80]
    ])

    features = [
        geojson.Feature(geometry=nh44, properties={"id": "road_nh44", "name": "National Highway 44 (NH44)", "type": "Highway"})
    ]
    return geojson.FeatureCollection(features)

def create_villages():
    villages = [
        {"name": "Mansar", "coords": [79.27, 21.39], "pop": 8200},
        {"name": "Ramtek", "coords": [79.33, 21.39], "pop": 22000},
        {"name": "Deolapar", "coords": [79.32, 21.56], "pop": 3400},
        {"name": "Sillari", "coords": [79.33, 21.62], "pop": 1200},
        {"name": "Khawasa", "coords": [79.32, 21.71], "pop": 4100},
        {"name": "Paoni", "coords": [79.18, 21.58], "pop": 1800}
    ]

    features = []
    for idx, v in enumerate(villages):
        geom = geojson.Point(v["coords"])
        features.append(geojson.Feature(
            geometry=geom,
            properties={
                "id": f"village_{idx}",
                "name": v["name"],
                "type": "Village",
                "population": v["pop"]
            }
        ))
    return geojson.FeatureCollection(features)

def create_protected():
    # Pench Core Tiger Reserve Zone (Strict conservation area)
    pench_core = geojson.Polygon([[
        [79.22, 21.68],
        [79.40, 21.68],
        [79.42, 21.79],
        [79.20, 21.79],
        [79.22, 21.68]
    ]])

    features = [
        geojson.Feature(geometry=pench_core, properties={"id": "protected_pench_core", "name": "Pench Tiger Reserve - Core Area", "type": "ProtectedArea"})
    ]
    return geojson.FeatureCollection(features)

def get_all_layers():
    """Returns a dict of all GeoJSON layers for visual styling and toggling in the UI."""
    return {
        "forests": create_forests(),
        "corridors": create_corridors(),
        "water": create_water(),
        "roads": create_roads(),
        "villages": create_villages(),
        "protected": create_protected()
    }

def get_bounds():
    """Returns the geographic bounding box of the workspace area."""
    return {
        "min_lat": 21.1,
        "max_lat": 21.8,
        "min_lon": 79.0,
        "max_lon": 79.5
    }
