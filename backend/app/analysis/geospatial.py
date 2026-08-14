import math
from shapely.geometry import LineString, Polygon, Point, MultiPolygon, MultiPoint
from shapely.ops import unary_union, transform
from app.config import DEFAULT_WEIGHTS, BUFFER_SIZES, COST_COEFFICIENTS
from app.data import mock_data

# Approximate conversion scale for Nagpur/Pench region (latitude ~21.5 N)
LAT_DIST_METER = 111130.0
LON_DIST_METER = 103400.0

def project_to_meters(geom):
    """Projects a WGS84 geometry to a local metric coordinate system (meters) for accurate measurements."""
    if geom.is_empty:
        return geom
    return transform(lambda lon, lat, z=None: (lon * LON_DIST_METER, lat * LAT_DIST_METER), geom)

def project_to_wgs84(geom):
    """Helper to project back to WGS84 degrees if needed."""
    if geom.is_empty:
        return geom
    return transform(lambda x, y, z=None: (x / LON_DIST_METER, y / LAT_DIST_METER), geom)

def calculate_polyline_length_km(line) -> float:
    """Calculates the length of a LineString or MultiLineString in kilometers."""
    if line.is_empty:
        return 0.0
    line_m = project_to_meters(line)
    return line_m.length / 1000.0

def calculate_area_hectares(geom) -> float:
    """Calculates the area of a polygon in hectares (1 hectare = 10,000 sqm)."""
    if geom.is_empty:
        return 0.0
    geom_m = project_to_meters(geom)
    return geom_m.area / 10000.0

def analyze_proposed_road(coordinates, custom_weights=None):
    """
    Analyzes the ecological impact and calculates the score for a proposed road path.
    :param coordinates: List of [lon, lat] coordinates representing the road polyline.
    :param custom_weights: Optional dict of override weights.
    :return: Dict containing scores, statistics, and coordinates.
    """
    if not coordinates or len(coordinates) < 2:
        return {
            "error": "At least 2 points are required to define a road.",
            "ecological_score": 0,
            "metrics": {}
        }
    
    weights = custom_weights or DEFAULT_WEIGHTS
    
    # Create the road LineString
    road_line = LineString(coordinates)
    total_length_km = calculate_polyline_length_km(road_line)
    if total_length_km == 0:
        return {"error": "Road length is 0 km.", "ecological_score": 0, "metrics": {}}

    # Load Mock GIS layers (in shapely geometries)
    forests_fc = mock_data.create_forests()
    corridors_fc = mock_data.create_corridors()
    water_fc = mock_data.create_water()
    roads_fc = mock_data.create_roads()
    villages_fc = mock_data.create_villages()
    protected_fc = mock_data.create_protected()

    # Convert geojson features to shapely geometries
    forests_geom = unary_union([Polygon(f.geometry.coordinates[0]) for f in forests_fc.features])
    corridors_geom = unary_union([Polygon(f.geometry.coordinates[0]) for f in corridors_fc.features])
    
    water_lines = []
    water_polys = []
    for f in water_fc.features:
        if f.geometry.type == "LineString":
            water_lines.append(LineString(f.geometry.coordinates))
        elif f.geometry.type == "Polygon":
            water_polys.append(Polygon(f.geometry.coordinates[0]))
    water_lines_geom = unary_union(water_lines)
    water_polys_geom = unary_union(water_polys)
    
    existing_roads_geom = unary_union([LineString(f.geometry.coordinates) for f in roads_fc.features])
    
    villages = [Point(f.geometry.coordinates) for f in villages_fc.features]
    villages_names = [f.properties["name"] for f in villages_fc.features]
    
    protected_geom = unary_union([Polygon(f.geometry.coordinates[0]) for f in protected_fc.features])

    # 1. Forest Impact
    forest_intersection = road_line.intersection(forests_geom)
    forest_length_km = calculate_polyline_length_km(forest_intersection)
    forest_percentage = (forest_length_km / total_length_km) * 100.0
    
    # Estimate affected area by buffering the road line in the forest
    forest_buffer_width_deg = BUFFER_SIZES["forest_affected_buffer"] / LON_DIST_METER
    road_buffer_in_forest = forest_intersection.buffer(forest_buffer_width_deg)
    # Clip buffer to the actual forest boundary to find affected forest area
    affected_forest_geom = road_buffer_in_forest.intersection(forests_geom)
    affected_forest_ha = calculate_area_hectares(affected_forest_geom)

    # Specific forest details
    violated_forests = []
    for f in forests_fc.features:
        f_geom = Polygon(f.geometry.coordinates[0])
        intersection = road_line.intersection(f_geom)
        length_km = calculate_polyline_length_km(intersection)
        if length_km > 0:
            violated_forests.append({
                "name": f.properties["name"],
                "length_km": round(length_km, 2),
                "gis_source": f.properties.get("gis_source", "Unknown")
            })

    # 2. Corridor Impact
    corridor_intersection = road_line.intersection(corridors_geom)
    corridor_length_km = calculate_polyline_length_km(corridor_intersection)
    corridor_percentage = (corridor_length_km / total_length_km) * 100.0

    # Specific corridor details
    violated_corridors = []
    for f in corridors_fc.features:
        f_geom = Polygon(f.geometry.coordinates[0])
        intersection = road_line.intersection(f_geom)
        length_km = calculate_polyline_length_km(intersection)
        if length_km > 0:
            violated_corridors.append({
                "name": f.properties["name"],
                "length_km": round(length_km, 2),
                "criticality": f.properties.get("criticality", "Medium"),
                "gis_source": f.properties.get("gis_source", "Unknown")
            })

    # 3. Water Crossings
    # Crossing a river (LineString intersection points)
    river_intersections = road_line.intersection(water_lines_geom)
    river_crossings = 0
    if not river_intersections.is_empty:
        if isinstance(river_intersections, Point):
            river_crossings = 1
        elif isinstance(river_intersections, MultiPoint):
            river_crossings = len(river_intersections.geoms)
        elif isinstance(river_intersections, LineString):
            river_crossings = 1  # touched/aligned
        else:
            river_crossings = 1
            
    # Crossing a lake/reservoir (polygon intersection)
    lake_intersection = road_line.intersection(water_polys_geom)
    lake_length_km = calculate_polyline_length_km(lake_intersection)
    lake_crossings = 1 if lake_length_km > 0 else 0
    
    total_water_crossings = river_crossings + lake_crossings
    water_score = min(100.0, total_water_crossings * 25.0)

    # 4. Village Proximity
    village_buffer_deg = BUFFER_SIZES["village_proximity_buffer"] / LON_DIST_METER
    village_buffers = [v.buffer(village_buffer_deg) for v in villages]
    village_buffers_geom = unary_union(village_buffers)
    
    village_intersection = road_line.intersection(village_buffers_geom)
    village_length_km = calculate_polyline_length_km(village_intersection)
    village_percentage = (village_length_km / total_length_km) * 100.0
    
    # Identify which villages are within 500m
    near_villages = []
    for idx, v in enumerate(villages):
        if road_line.distance(v) * LON_DIST_METER <= BUFFER_SIZES["village_proximity_buffer"]:
            near_villages.append(villages_names[idx])

    # 5. Habitat Fragmentation
    # Let's count how much of the road is in "pristine" zones (further than 1.5 km from existing NH44)
    pristine_buffer_deg = 1500.0 / LON_DIST_METER
    existing_road_buffer = existing_roads_geom.buffer(pristine_buffer_deg)
    road_in_pristine = road_line.difference(existing_road_buffer)
    pristine_length_km = calculate_polyline_length_km(road_in_pristine)
    pristine_percentage = (pristine_length_km / total_length_km) * 100.0
    
    # Also check if it physically bisects forest patches
    # If we difference the forest with a buffered road, does it increase the number of polygons?
    fragmentation_score = pristine_percentage
    # If the road goes deep into the forest (high forest percentage) and it's far from existing roads,
    # fragmentation is severe. Let's blend forest_percentage and pristine_percentage
    fragmentation_score = 0.6 * pristine_percentage + 0.4 * forest_percentage

    # 6. Protected Area Core Violations (Crucial warning check, adds penalty)
    protected_intersection = road_line.intersection(protected_geom)
    protected_length_km = calculate_polyline_length_km(protected_intersection)
    protected_percentage = (protected_length_km / total_length_km) * 100.0

    # Specific protected core violations
    violated_protected_areas = []
    for f in protected_fc.features:
        f_geom = Polygon(f.geometry.coordinates[0])
        intersection = road_line.intersection(f_geom)
        length_km = calculate_polyline_length_km(intersection)
        if length_km > 0:
            violated_protected_areas.append({
                "name": f.properties["name"],
                "length_km": round(length_km, 2),
                "gis_source": f.properties.get("gis_source", "Unknown")
            })
    
    # Normalized Individual Scores (0-100 range)
    score_forest = forest_percentage
    score_corridor = corridor_percentage
    score_water = water_score
    score_fragmentation = fragmentation_score
    score_village = village_percentage
    
    # Calculate Weighted Ecological Score
    raw_eco_score = (
        score_forest * weights["forest"] +
        score_corridor * weights["corridor"] +
        score_water * weights["water"] +
        score_fragmentation * weights["fragmentation"] +
        score_village * weights["village"]
    )
    
    # If it violates the Protected Core Area, we apply a significant penalty (adds up to 30 points, capped at 100)
    penalty = 0.0
    if protected_length_km > 0:
        penalty = min(30.0, 10.0 + (protected_length_km / total_length_km) * 20.0)
    
    ecological_score = min(100.0, raw_eco_score + penalty)

    # Estimate Construction Cost (in Crore Rupees)
    base_cost = total_length_km * COST_COEFFICIENTS["base_road_cost_per_km"]
    forest_premium = forest_length_km * COST_COEFFICIENTS["forest_crossing_premium_per_km"]
    corridor_premium = corridor_length_km * COST_COEFFICIENTS["corridor_crossing_premium_per_km"]
    bridge_cost = total_water_crossings * COST_COEFFICIENTS["water_crossing_bridge_cost"]
    
    total_cost = base_cost + forest_premium + corridor_premium + bridge_cost

    return {
        "distance_km": round(total_length_km, 2),
        "ecological_score": round(ecological_score, 1),
        "construction_cost_million": round(total_cost, 2),
        "protected_violation_km": round(protected_length_km, 2),
        "violated_protected_areas": violated_protected_areas,
        "breakdown": {
            "forest": {
                "score": round(score_forest, 1),
                "length_km": round(forest_length_km, 2),
                "affected_area_ha": round(affected_forest_ha, 1),
                "details": violated_forests
            },
            "corridor": {
                "score": round(score_corridor, 1),
                "length_km": round(corridor_length_km, 2),
                "details": violated_corridors
            },
            "water": {
                "score": round(score_water, 1),
                "crossings_count": total_water_crossings
            },
            "fragmentation": {
                "score": round(score_fragmentation, 1),
                "pristine_km": round(pristine_length_km, 2)
            },
            "village": {
                "score": round(score_village, 1),
                "length_km": round(village_length_km, 2),
                "affected_villages": near_villages
            }
        }
    }
