from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from app.data import mock_data
from app.analysis import geospatial
from app.routes import routing
from app.mitigation import optimizer

app = FastAPI(
    title="Aranyam API",
    description="Decision support API for Ecological Infrastructure Planning around Pench Region",
    version="1.0.0"
)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic input models
class AnalyzeInput(BaseModel):
    coordinates: List[List[float]] # [[lon, lat], ...]
    weights: Optional[Dict[str, float]] = None

class AlternativesInput(BaseModel):
    start: List[float]  # [lon, lat]
    end: List[float]    # [lon, lat]
    weights: Optional[Dict[str, float]] = None

class RouteData(BaseModel):
    id: str
    name: str
    description: str
    coordinates: List[List[float]]
    analysis: dict
    recommended: bool

class OptimizeInput(BaseModel):
    routes: List[RouteData]
    budget: float # in millions
    weights: Optional[Dict[str, float]] = None

@app.get("/")
def read_root():
    return {
        "app": "Aranyam - AI-assisted Ecological Infrastructure Planning",
        "status": "Healthy",
        "region": "Nagpur/Pench buffer zone",
        "important_disclaimer": "This is a decision support tool utilizing simulated GeoJSON data. Not a legal environmental clearance system or official EIA replacement."
    }

@app.get("/api/layers")
def get_layers():
    """Returns all geographic layers for Leaflet mapping."""
    return mock_data.get_all_layers()

@app.post("/api/analyze")
def analyze_route(data: AnalyzeInput):
    """Analyzes the ecological impact of a user-drawn polyline route."""
    if len(data.coordinates) < 2:
        raise HTTPException(status_code=400, detail="A road must have at least 2 points (Start and End).")
    
    # Calculate score & statistics
    analysis = geospatial.analyze_proposed_road(data.coordinates, data.weights)
    if "error" in analysis:
        raise HTTPException(status_code=400, detail=analysis["error"])
        
    # Generate mitigations
    mitigations = optimizer.get_mitigation_recommendations(analysis["breakdown"])
    
    return {
        "coordinates": data.coordinates,
        "analysis": analysis,
        "suggested_mitigations": mitigations
    }

@app.post("/api/alternatives")
def get_alternatives(data: AlternativesInput):
    """Generates three alternative routes: Shortest, Balanced, and Recommended Eco-Optimized."""
    if len(data.start) != 2 or len(data.end) != 2:
        raise HTTPException(status_code=400, detail="Start and End coordinates must contain [longitude, latitude].")
    
    routes = routing.generate_alternative_routes(
        data.start[0], data.start[1],
        data.end[0], data.end[1],
        data.weights
    )
    return routes

@app.post("/api/optimize")
def optimize_budget(data: OptimizeInput):
    """Finds the optimal path + mitigation packages within the given construction budget."""
    routes_dict = [r.dict() for r in data.routes]
    result = optimizer.optimize_for_budget(routes_dict, data.budget, data.weights)
    return result
