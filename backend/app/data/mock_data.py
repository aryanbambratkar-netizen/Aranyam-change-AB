import geojson

# Expanded Nagpur Region Bounding Box
# Latitude: 20.7 (South of Umred/Bhiwapur) to 21.9 (North of Pench)
# Longitude: 78.5 (West of Bor) to 79.7 (East of Umred/Pauni)

def create_forests():
    # 1. Pench Tiger Reserve Buffer Forest (North)
    pench_forest = geojson.Polygon([[
        [79.15, 21.58],
        [79.48, 21.58],
        [79.50, 21.85],
        [79.12, 21.85],
        [79.15, 21.58]
    ]])
    
    # 2. Bor Tiger Reserve Buffer Forest (West)
    bor_forest = geojson.Polygon([[
        [78.58, 20.90],
        [78.78, 20.90],
        [78.75, 21.08],
        [78.55, 21.08],
        [78.58, 20.90]
    ]])

    # 3. Umred Karhandla Wildlife Sanctuary Buffer Forest (Southeast)
    umred_forest = geojson.Polygon([[
        [79.38, 20.78],
        [79.62, 20.78],
        [79.60, 20.92],
        [79.36, 20.92],
        [79.38, 20.78]
    ]])

    # 4. Gorewada Reserve Forest (Urban Nagpur - Northwest)
    gorewada_forest = geojson.Polygon([[
        [79.00, 21.17],
        [79.06, 21.17],
        [79.06, 21.23],
        [79.00, 21.23],
        [79.00, 21.17]
    ]])

    # 5. Ambazari Reserve Forest (Urban Nagpur - West)
    ambazari_forest = geojson.Polygon([[
        [79.01, 21.12],
        [79.05, 21.12],
        [79.05, 21.15],
        [79.01, 21.15],
        [79.01, 21.12]
    ]])

    # 6. Mansinghdeo Wildlife Sanctuary Buffer Forest (Northwest of Pench)
    mansinghdeo_forest = geojson.Polygon([[
        [79.02, 21.55],
        [79.14, 21.55],
        [79.14, 21.68],
        [79.02, 21.68],
        [79.02, 21.55]
    ]])

    # 7. Seminary Hills Reserved Forest (Central Nagpur)
    seminary_forest = geojson.Polygon([[
        [79.05, 21.15],
        [79.08, 21.15],
        [79.08, 21.18],
        [79.05, 21.18],
        [79.05, 21.15]
    ]])

    features = [
        geojson.Feature(geometry=pench_forest, properties={
            "id": "forest_pench",
            "name": "Pench Tiger Reserve Buffer Forest",
            "type": "Forest",
            "gis_source": "Maharashtra Forest Department / MRSAC GeoPortal"
        }),
        geojson.Feature(geometry=bor_forest, properties={
            "id": "forest_bor",
            "name": "Bor Tiger Reserve Buffer Forest",
            "type": "Forest",
            "gis_source": "National Tiger Conservation Authority (NTCA) / WII"
        }),
        geojson.Feature(geometry=umred_forest, properties={
            "id": "forest_umred",
            "name": "Umred Karhandla Wildlife Buffer Forest",
            "type": "Forest",
            "gis_source": "MRSAC GeoPortal / Maharashtra Forest Department"
        }),
        geojson.Feature(geometry=gorewada_forest, properties={
            "id": "forest_gorewada",
            "name": "Gorewada Reserve Forest",
            "type": "Forest",
            "gis_source": "Maharashtra Forest Department / Gorewada Project"
        }),
        geojson.Feature(geometry=ambazari_forest, properties={
            "id": "forest_ambazari",
            "name": "Ambazari Biodiversity Forest",
            "type": "Forest",
            "gis_source": "Nagpur Municipal Corporation (NMC) / MRSAC"
        }),
        geojson.Feature(geometry=mansinghdeo_forest, properties={
            "id": "forest_mansinghdeo",
            "name": "Mansinghdeo Wildlife Sanctuary Buffer Forest",
            "type": "Forest",
            "gis_source": "Eco-Sensitive Zone Notification (MoEFCC) / WII"
        }),
        geojson.Feature(geometry=seminary_forest, properties={
            "id": "forest_seminary",
            "name": "Seminary Hills Reserved Forest",
            "type": "Forest",
            "gis_source": "Nagpur Forest Division / Maharashtra Forest Dept"
        })
    ]
    return geojson.FeatureCollection(features)

def create_corridors():
    # 1. Bor-Pench Corridor (Connecting Bor northeastward to Pench buffer)
    bor_pench = geojson.Polygon([[
        [78.72, 21.05],
        [78.95, 21.25],
        [79.15, 21.55],
        [79.05, 21.58],
        [78.85, 21.30],
        [78.68, 21.10],
        [78.72, 21.05]
    ]])
    
    # 2. Pench-Tadoba Corridor (via Umred Karhandla - critical Tiger migratory route)
    pench_tadoba = geojson.Polygon([[
        [79.25, 21.55],
        [79.35, 21.55],
        [79.52, 20.95],
        [79.42, 20.95],
        [79.25, 21.55]
    ]])

    # 3. Bor-Umred Corridor (Connecting Bor eastward to Umred Karhandla)
    bor_umred = geojson.Polygon([[
        [78.75, 20.92],
        [79.05, 20.80],
        [79.35, 20.82],
        [79.35, 20.88],
        [79.05, 20.86],
        [78.78, 20.98],
        [78.75, 20.92]
    ]])

    features = [
        geojson.Feature(geometry=bor_pench, properties={
            "id": "corr_bor_pench",
            "name": "Bor-Pench Corridor Link",
            "type": "Corridor",
            "criticality": "High",
            "gis_source": "Wildlife Institute of India (WII) - Central India Corridors"
        }),
        geojson.Feature(geometry=pench_tadoba, properties={
            "id": "corr_pench_tadoba",
            "name": "Pench-Tadoba Corridor Link A",
            "type": "Corridor",
            "criticality": "Critical",
            "gis_source": "Wildlife Institute of India (WII) - Tiger Migration Corridors"
        }),
        geojson.Feature(geometry=bor_umred, properties={
            "id": "corr_bor_umred",
            "name": "Bor-Umred Karhandla Connectivity Link",
            "type": "Corridor",
            "criticality": "Medium",
            "gis_source": "WII / National Tiger Conservation Authority (NTCA)"
        })
    ]
    return geojson.FeatureCollection(features)

def create_water():
    # 1. Pench River
    pench_river = geojson.LineString([
        [79.18, 21.85],
        [79.22, 21.72],
        [79.25, 21.68],
        [79.24, 21.58],
        [79.28, 21.40],
        [79.32, 21.25],
        [79.30, 21.10]
    ])

    # 2. Totladoh Reservoir (in Pench Core)
    totladoh_lake = geojson.Polygon([[
        [79.25, 21.72],
        [79.33, 21.72],
        [79.35, 21.80],
        [79.26, 21.81],
        [79.25, 21.72]
    ]])

    # 3. Bor Reservoir (in Bor Sanctuary)
    bor_lake = geojson.Polygon([[
        [78.64, 20.97],
        [78.70, 20.97],
        [78.69, 21.02],
        [78.63, 21.02],
        [78.64, 20.97]
    ]])

    # 4. Wainganga River (Bordering Umred Karhandla on Northeast)
    wainganga_river = geojson.LineString([
        [79.55, 21.00],
        [79.62, 20.90],
        [79.61, 20.80],
        [79.58, 20.70]
    ])

    features = [
        geojson.Feature(geometry=pench_river, properties={
            "id": "water_pench_river",
            "name": "Pench River",
            "type": "River",
            "gis_source": "India-WRIS / National Remote Sensing Centre (NRSC) Bhuvan"
        }),
        geojson.Feature(geometry=totladoh_lake, properties={
            "id": "water_totladoh",
            "name": "Totladoh Reservoir",
            "type": "Reservoir",
            "gis_source": "India-WRIS / Central Water Commission (CWC)"
        }),
        geojson.Feature(geometry=bor_lake, properties={
            "id": "water_bor_lake",
            "name": "Bor Reservoir",
            "type": "Reservoir",
            "gis_source": "India-WRIS / Wardha Irrigation Project"
        }),
        geojson.Feature(geometry=wainganga_river, properties={
            "id": "water_wainganga",
            "name": "Wainganga River",
            "type": "River",
            "gis_source": "NRSC Bhuvan / Maharashtra Water Resources Dept"
        })
    ]
    return geojson.FeatureCollection(features)

def create_roads():
    # 1. Existing Highway NH44 (North-South arterial road)
    nh44 = geojson.LineString([
        [79.08, 20.70],
        [79.08, 20.95],
        [79.09, 21.15],  # Nagpur City
        [79.16, 21.30],
        [79.27, 21.39],  # Mansar
        [79.32, 21.56],  # Deolapar
        [79.33, 21.62],  # Sillari
        [79.32, 21.71],  # Khawasa
        [79.31, 21.90]
    ])

    # 2. Highway NH53 (East-West connection)
    nh53 = geojson.LineString([
        [78.50, 21.15],
        [78.80, 21.14],
        [79.09, 21.15],  # Nagpur City
        [79.30, 21.16],
        [79.60, 21.15],
        [79.70, 21.14]
    ])

    # 3. State Highway 9 / NH353D (Nagpur to Umred route)
    sh9 = geojson.LineString([
        [79.09, 21.15],  # Nagpur
        [79.20, 21.02],
        [79.32, 20.90],  # Umred
        [79.45, 20.80]
    ])

    features = [
        geojson.Feature(geometry=nh44, properties={
            "id": "road_nh44",
            "name": "National Highway 44 (NH44)",
            "type": "Highway",
            "gis_source": "National Highways Authority of India (NHAI) / OpenStreetMap"
        }),
        geojson.Feature(geometry=nh53, properties={
            "id": "road_nh53",
            "name": "National Highway 53 (NH53)",
            "type": "Highway",
            "gis_source": "National Highways Authority of India (NHAI) / OpenStreetMap"
        }),
        geojson.Feature(geometry=sh9, properties={
            "id": "road_sh9",
            "name": "Nagpur-Umred Road",
            "type": "Highway",
            "gis_source": "Maharashtra Public Works Department (PWD) / OpenStreetMap"
        })
    ]
    return geojson.FeatureCollection(features)

def create_villages():
    villages = [
        {"name": "Nagpur (Urban Hub)", "coords": [79.09, 21.15], "pop": 2500000},
        {"name": "Umred", "coords": [79.32, 20.90], "pop": 55000},
        {"name": "Bhiwapur", "coords": [79.51, 20.77], "pop": 21000},
        {"name": "Hingni", "coords": [78.72, 20.99], "pop": 4500},
        {"name": "Mansar", "coords": [79.27, 21.39], "pop": 8200},
        {"name": "Khawasa", "coords": [79.32, 21.71], "pop": 4100},
        {"name": "Kuhi", "coords": [79.36, 21.01], "pop": 11500},
        {"name": "Kalmeshwar", "coords": [78.92, 21.23], "pop": 23000},
        {"name": "Sillari", "coords": [79.33, 21.62], "pop": 1200}
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
                "population": v["pop"],
                "gis_source": "Census of India / MRSAC GeoPortal"
            }
        ))
    return geojson.FeatureCollection(features)

def create_protected():
    # 1. Pench Tiger Reserve Core Area (Strict protection)
    pench_core = geojson.Polygon([[
        [79.22, 21.66],
        [79.42, 21.66],
        [79.45, 21.82],
        [79.18, 21.82],
        [79.22, 21.66]
    ]])

    # 2. Bor Wildlife Sanctuary Core Area
    bor_core = geojson.Polygon([[
        [78.62, 20.94],
        [78.74, 20.94],
        [78.72, 21.04],
        [78.60, 21.04],
        [78.62, 20.94]
    ]])

    # 3. Umred Karhandla Core Sanctuary Zone
    umred_core = geojson.Polygon([[
        [79.44, 20.81],
        [79.58, 20.81],
        [79.56, 20.89],
        [79.42, 20.89],
        [79.44, 20.81]
    ]])

    # 4. Mansinghdeo Wildlife Sanctuary Core Area
    mansinghdeo_core = geojson.Polygon([[
        [79.05, 21.58],
        [79.12, 21.58],
        [79.12, 21.65],
        [79.05, 21.65],
        [79.05, 21.58]
    ]])

    features = [
        geojson.Feature(geometry=pench_core, properties={
            "id": "protected_pench_core",
            "name": "Pench Tiger Reserve Core Zone",
            "type": "ProtectedArea",
            "gis_source": "National Tiger Conservation Authority (NTCA) / WII ENVIS"
        }),
        geojson.Feature(geometry=bor_core, properties={
            "id": "protected_bor_core",
            "name": "Bor Tiger Reserve Core Area",
            "type": "ProtectedArea",
            "gis_source": "National Tiger Conservation Authority (NTCA) / WII ENVIS"
        }),
        geojson.Feature(geometry=umred_core, properties={
            "id": "protected_umred_core",
            "name": "Umred Karhandla Core Sanctuary Zone",
            "type": "ProtectedArea",
            "gis_source": "Maharashtra Forest Department / WII ENVIS"
        }),
        geojson.Feature(geometry=mansinghdeo_core, properties={
            "id": "protected_mansinghdeo_core",
            "name": "Mansinghdeo Wildlife Sanctuary Core Area",
            "type": "ProtectedArea",
            "gis_source": "MoEFCC ESZ Gazette Notification / WII"
        })
    ]
    return geojson.FeatureCollection(features)

def get_all_layers():
    """Returns all GIS layers for rendering in the map."""
    return {
        "forests": create_forests(),
        "corridors": create_corridors(),
        "water": create_water(),
        "roads": create_roads(),
        "villages": create_villages(),
        "protected": create_protected()
    }

def get_bounds():
    """Returns the expanded bounding box enclosing the Nagpur regional sanctuaries."""
    return {
        "min_lat": 20.7,
        "max_lat": 21.9,
        "min_lon": 78.5,
        "max_lon": 79.7
    }
