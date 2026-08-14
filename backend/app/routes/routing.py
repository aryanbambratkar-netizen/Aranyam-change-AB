import math
import heapq
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import unary_union
from app.data import mock_data
from app.analysis.geospatial import LON_DIST_METER, LAT_DIST_METER

# Grid size
NX = 50
NY = 50

# Bounding box
MIN_LAT, MAX_LAT = 20.7, 21.9
MIN_LON, MAX_LON = 78.5, 79.7

def get_grid_coords(x, y):
    """Converts grid cell indices to longitude/latitude."""
    lon = MIN_LON + (x / (NX - 1)) * (MAX_LON - MIN_LON)
    lat = MIN_LAT + (y / (NY - 1)) * (MAX_LAT - MIN_LAT)
    return lon, lat

def get_grid_indices(lon, lat):
    """Converts longitude/latitude to closest grid indices."""
    x = int(round((lon - MIN_LON) / (MAX_LON - MIN_LON) * (NX - 1)))
    y = int(round((lat - MIN_LAT) / (MAX_LAT - MIN_LAT) * (NY - 1)))
    x = max(0, min(NX - 1, x))
    y = max(0, min(NY - 1, y))
    return x, y

class GridCostMap:
    def __init__(self):
        # Load geometries for checking overlaps
        self.forests = unary_union([Polygon(f.geometry.coordinates[0]) for f in mock_data.create_forests().features])
        self.corridors = unary_union([Polygon(f.geometry.coordinates[0]) for f in mock_data.create_corridors().features])
        self.protected = unary_union([Polygon(f.geometry.coordinates[0]) for f in mock_data.create_protected().features])
        
        # Water bodies (buffers are created to make them occupy grid cells)
        water_features = mock_data.create_water().features
        water_geoms = []
        for f in water_features:
            if f.geometry.type == "LineString":
                water_geoms.append(LineString(f.geometry.coordinates).buffer(0.005)) # ~500m buffer for grid cost
            elif f.geometry.type == "Polygon":
                water_geoms.append(Polygon(f.geometry.coordinates[0]))
        self.water = unary_union(water_geoms)
        
        # Villages (point buffers)
        villages = [Point(f.geometry.coordinates) for f in mock_data.create_villages().features]
        self.villages = unary_union([v.buffer(0.008) for v in villages]) # ~800m buffer
        
        # Precompute costs for the grid
        self.costs = {}
        self._precompute()

    def _precompute(self):
        for x in range(NX):
            for y in range(NY):
                lon, lat = get_grid_coords(x, y)
                pt = Point(lon, lat)
                
                # Base cost is 1.0 (empty space/fields)
                cost = 1.0
                
                # Intersections add to the cost
                if self.protected.contains(pt):
                    cost += 200.0  # Protected area is extremely restricted
                if self.forests.contains(pt):
                    cost += 25.0   # Forest is high impact
                if self.corridors.contains(pt):
                    cost += 20.0   # Corridors are high impact
                if self.water.contains(pt):
                    cost += 30.0   # Water crossing premium
                if self.villages.contains(pt):
                    cost += 5.0    # Avoid close village proximity
                
                self.costs[(x, y)] = cost

    def get_cell_cost(self, x, y, weight_multiplier=1.0):
        # Base distance cost is always 1.0, the ecological part is scaled
        eco_cost = self.costs[(x, y)] - 1.0
        return 1.0 + (eco_cost * weight_multiplier)

# Create a single global cost map instance
_cost_map = None
def get_cost_map():
    global _cost_map
    if _cost_map is None:
        _cost_map = GridCostMap()
    return _cost_map

def a_star(start_node, end_node, weight_multiplier):
    """
    Standard A* algorithm on a grid.
    :param start_node: (x, y) tuple.
    :param end_node: (x, y) tuple.
    :param weight_multiplier: 0.0 for pure shortest path, 1.0 for fully eco-weighted path.
    """
    cost_map = get_cost_map()
    
    # Priority queue stores tuples of (f_score, (x, y))
    open_set = []
    heapq.heappush(open_set, (0.0, start_node))
    
    came_from = {}
    g_score = {start_node: 0.0}
    
    # Directions: 8-way movement
    directions = [
        (0, 1, 1.0), (1, 0, 1.0), (0, -1, 1.0), (-1, 0, 1.0),
        (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)
    ]
    
    while open_set:
        _, current = heapq.heappop(open_set)
        
        if current == end_node:
            # Reconstruct path
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()
            return path
            
        x, y = current
        for dx, dy, step_dist in directions:
            neighbor = (x + dx, y + dy)
            if 0 <= neighbor[0] < NX and 0 <= neighbor[1] < NY:
                # Cost is average of current and neighbor grid costs, scaled by step distance (diagonal vs straight)
                c_current = cost_map.get_cell_cost(x, y, weight_multiplier)
                c_neighbor = cost_map.get_cell_cost(neighbor[0], neighbor[1], weight_multiplier)
                edge_cost = step_dist * (c_current + c_neighbor) / 2.0
                
                tentative_g = g_score[current] + edge_cost
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    
                    # Heuristic (Euclidean distance to goal)
                    h_val = math.sqrt((neighbor[0] - end_node[0])**2 + (neighbor[1] - end_node[1])**2)
                    # We scale the heuristic to be consistent with base costs
                    f_val = tentative_g + h_val * 1.0 
                    
                    heapq.heappush(open_set, (f_val, neighbor))
                    
    return [] # No path found

def generate_alternative_routes(start_lon, start_lat, end_lon, end_lat, custom_weights=None):
    """
    Generates 3 alternatives (Shortest, Balanced, Recommended/Eco-Optimized)
    between the given start and end coordinates.
    """
    start_node = get_grid_indices(start_lon, start_lat)
    end_node = get_grid_indices(end_lon, end_lat)

    # 1. Shortest Path (development optimized, ignores environment)
    shortest_indices = a_star(start_node, end_node, weight_multiplier=0.0)
    
    # 2. Balanced Path (moderate ecological weighting)
    balanced_indices = a_star(start_node, end_node, weight_multiplier=0.3)
    
    # 3. Recommended Eco-Optimized Path (strong ecological weighting)
    recommended_indices = a_star(start_node, end_node, weight_multiplier=1.2)

    routes = []
    
    # Helper to convert grid index path back to coordinate lists
    def indices_to_coords(indices):
        coords = []
        for idx, (x, y) in enumerate(indices):
            # Smooth/perturb slightly to make it look like a real polyline instead of blocky grid steps
            lon, lat = get_grid_coords(x, y)
            coords.append([lon, lat])
        # Ensure exact start and end are preserved
        if coords:
            coords[0] = [start_lon, start_lat]
            coords[-1] = [end_lon, end_lat]
        return coords

    # Create coordinate lists
    shortest_coords = indices_to_coords(shortest_indices)
    balanced_coords = indices_to_coords(balanced_indices)
    recommended_coords = indices_to_coords(recommended_indices)

    # If any path generation failed, fallback to straight line
    fallback = [[start_lon, start_lat], [end_lon, end_lat]]
    if not shortest_coords: shortest_coords = fallback
    if not balanced_coords: balanced_coords = fallback
    if not recommended_coords: recommended_coords = fallback

    from app.analysis.geospatial import analyze_proposed_road

    # Run full geospatial analysis on each generated route
    shortest_analysis = analyze_proposed_road(shortest_coords, custom_weights)
    balanced_analysis = analyze_proposed_road(balanced_coords, custom_weights)
    recommended_analysis = analyze_proposed_road(recommended_coords, custom_weights)

    return [
        {
            "id": "shortest",
            "name": "Shortest Route (Development Optimized)",
            "description": "Direct route minimizing construction distance. Ignores ecological impact.",
            "coordinates": shortest_coords,
            "analysis": shortest_analysis,
            "recommended": False
        },
        {
            "id": "balanced",
            "name": "Balanced Route (Compromise)",
            "description": "Bypasses high-risk zones where possible, but maintains a shorter route length.",
            "coordinates": balanced_coords,
            "analysis": balanced_analysis,
            "recommended": False
        },
        {
            "id": "recommended",
            "name": "Recommended Route (Eco-Optimized)",
            "description": "Lowest impact route. Automatically routes around core forests, corridors, and protected areas.",
            "coordinates": recommended_coords,
            "analysis": recommended_analysis,
            "recommended": True
        }
    ]
