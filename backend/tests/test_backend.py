import pytest
from app.analysis import geospatial
from app.routes import routing
from app.mitigation import optimizer

def test_analyze_proposed_road():
    # Coords from Sillari to Mansar
    coords = [[79.33, 21.62], [79.27, 21.39]]
    analysis = geospatial.analyze_proposed_road(coords)
    
    assert "ecological_score" in analysis
    assert "distance_km" in analysis
    assert analysis["distance_km"] > 0
    assert "breakdown" in analysis
    assert "construction_cost_million" in analysis
    
    # Ensure scores are within [0, 100]
    assert 0 <= analysis["ecological_score"] <= 100
    assert 0 <= analysis["breakdown"]["forest"]["score"] <= 100

def test_generate_alternative_routes():
    # Sillari to Mansar
    start = [79.33, 21.62]
    end = [79.27, 21.39]
    routes = routing.generate_alternative_routes(start[0], start[1], end[0], end[1])
    
    assert len(routes) == 3
    for r in routes:
        assert "id" in r
        assert "coordinates" in r
        assert len(r["coordinates"]) >= 2
        assert "analysis" in r
        
    # Ensure recommended has lower or equal ecological score than shortest
    shortest_score = next(r["analysis"]["ecological_score"] for r in routes if r["id"] == "shortest")
    rec_score = next(r["analysis"]["ecological_score"] for r in routes if r["id"] == "recommended")
    # Recommended should be lower impact
    assert rec_score <= shortest_score

def test_optimize_budget():
    start = [79.33, 21.62]
    end = [79.27, 21.39]
    routes = routing.generate_alternative_routes(start[0], start[1], end[0], end[1])
    
    # Check optimization with generous budget
    opt_result = optimizer.optimize_for_budget(routes, budget_limit_million=50.0)
    assert "recommended_plan" in opt_result
    assert opt_result["recommended_plan"]["within_budget"] is True
    
    # Check optimization with tight budget
    opt_result_tight = optimizer.optimize_for_budget(routes, budget_limit_million=1.0)
    assert "recommended_plan" in opt_result_tight
    # Should recommend something but tag it as outside budget (or fallback)
    assert opt_result_tight["recommended_plan"]["within_budget"] is False or opt_result_tight["recommended_plan"]["total_cost"] > 1.0
