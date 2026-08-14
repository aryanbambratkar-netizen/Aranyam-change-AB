# 🌲 Aranyam — AI-assisted Ecological Infrastructure Planning

> **"Simulate environmental impact while designing infrastructure, not after the project is finalized."**

Aranyam is a decision-support and simulation tool that lets infrastructure planners draw proposed roads through forest landscapes, calculate ecological impact in real-time, compare alternative routes, and recommend the lowest-impact option — all before any construction begins.

> ⚠️ **Important:** Aranyam provides *estimated ecological impact* for *decision support* only. It does **not** replace a formal Environmental Impact Assessment (EIA), provide legal clearance, or use official survey data. All demo data is simulated.

---

## ✨ USP

Traditional infrastructure projects assess environmental impact *after* the road alignment is finalized — leading to costly redesigns or irreversible ecological damage. Aranyam flips this by integrating ecological simulation *during* the design phase itself.

---

## 🏗️ Architecture

```
┌──────────────────────┐        ┌──────────────────────────────┐
│   React Frontend     │  HTTP  │      Python FastAPI Backend   │
│  (Vite + Tailwind)   │◄──────►│                              │
│                      │        │  /api/layers    → GeoJSON     │
│  • Leaflet Map       │        │  /api/analyze   → Shapely     │
│  • Dashboard         │        │  /api/alternatives → A* Grid  │
│  • Route Comparison  │        │  /api/optimize  → Budget Opt  │
│  • Mitigation Panel  │        │                              │
└──────────────────────┘        └──────────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS v3 |
| Map | Leaflet + React-Leaflet, OpenStreetMap (CARTO dark tiles) |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Python 3.14+, FastAPI, Uvicorn |
| Geospatial Analysis | Shapely 2.x |
| Routing | Custom grid-based A* pathfinder |
| Mitigation/Budget | Rule-based optimizer (transparent, no black-box AI) |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** (v18+) and **npm**
- **Python** (v3.10+) and **pip**

### 1. Clone & Enter Project

```bash
cd Aranyam
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

---

## ▶️ Run Commands

Open **two terminals**:

### Terminal 1 — Backend (FastAPI)

```bash
cd backend
..\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 — Frontend (Vite)

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173/** in your browser.

---

## 🗂️ Project Structure

```
Aranyam/
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI server with 4 endpoints
│   │   ├── config.py            # ⭐ Scoring weights & cost coefficients (edit here!)
│   │   ├── data/
│   │   │   └── mock_data.py     # Pench region GeoJSON layer generator
│   │   ├── analysis/
│   │   │   └── geospatial.py    # Shapely-based spatial intersections & scoring
│   │   ├── routes/
│   │   │   └── routing.py       # Grid-based A* least-cost pathfinder
│   │   └── mitigation/
│   │       └── optimizer.py     # Rule-based mitigation suggestions & budget optimizer
│   └── tests/
│       └── test_backend.py      # Pytest suite for analysis, routing, optimization
└── frontend/
    ├── index.html
    ├── tailwind.config.cjs
    ├── postcss.config.cjs
    ├── vite.config.js
    └── src/
        ├── App.jsx              # Main layout, state management, API integration
        ├── index.css            # Tailwind imports + Leaflet styles
        └── components/
            ├── MapContainer.jsx # Interactive Leaflet map with drawing & layers
            ├── Dashboard.jsx    # Ecological scoring dashboard with charts
            ├── Alternatives.jsx # Route comparison cards
            └── MitigationPanel.jsx # Mitigation suggestions & budget optimization
```

---

## 📐 Ecological Scoring Weights

All weights are defined in a single file: **`backend/app/config.py`**

```python
DEFAULT_WEIGHTS = {
    "forest": 0.35,        # 35% — Forest intersection length as % of total route
    "corridor": 0.30,      # 30% — Wildlife corridor intersection
    "water": 0.15,         # 15% — Number of river/lake crossings
    "fragmentation": 0.15, # 15% — Pristine habitat bisection index
    "village": 0.05        # 5%  — Proximity to village settlements
}
```

**How scoring works:**

1. Each factor produces a raw score (0–100) based on what percentage of the road intersects that ecological zone.
2. Scores are multiplied by their weight and summed.
3. A **penalty of up to +30 points** is applied if the road intersects a Protected Core Area (Tiger Reserve).
4. Final score is capped at 100.

| Score Range | Risk Level |
|-------------|-----------|
| 0–29 | 🟢 Low Ecological Risk |
| 30–59 | 🟡 Moderate Ecological Risk |
| 60–100 | 🔴 High Potential Risk |

---

## 🛤️ Route Analysis Methodology

### A* Grid-Based Least-Cost Pathfinding

1. An **50×50 grid** is overlaid on the Pench region bounding box (21.1°–21.8°N, 79.0°–79.5°E).
2. Each cell is assigned a traversal cost based on ecological overlaps:
   - Empty land: **1.0**
   - Forest: **+25.0**
   - Wildlife corridor: **+20.0**
   - Water body: **+30.0**
   - Village buffer: **+5.0**
   - Protected core area: **+200.0**
3. Three routes are generated using different weight multipliers:
   - **Shortest Route** (weight=0.0): Pure distance minimization, ignores ecology.
   - **Balanced Route** (weight=0.3): Moderate ecological avoidance.
   - **Recommended Route** (weight=1.2): Strong ecological avoidance.
4. Each route is then analyzed using full Shapely-based spatial intersection to produce accurate impact metrics.

---

## 📊 GeoJSON Data Format

All layers follow standard [GeoJSON](https://geojson.org/) FeatureCollection format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon, lat], [lon, lat], ...]]
      },
      "properties": {
        "id": "forest_pench",
        "name": "Pench Tiger Reserve Buffer Forest",
        "type": "Forest"
      }
    }
  ]
}
```

Supported geometry types:
- **Polygon**: Forests, corridors, protected areas, lakes
- **LineString**: Rivers, existing roads
- **Point**: Villages

---

## 🔄 Replacing Demo Data with Real Data

The data layer is designed for easy replacement:

1. **Edit `backend/app/data/mock_data.py`** — Replace `create_forests()`, `create_corridors()`, etc. with functions that load real GeoJSON files.

2. **Or load from files:** Modify `get_all_layers()` to read from disk:
   ```python
   import json
   def get_all_layers():
       with open("data/real_forests.geojson") as f:
           forests = json.load(f)
       # ... repeat for each layer
       return {"forests": forests, "corridors": corridors, ...}
   ```

3. **Integration points for real data sources:**

   | Source | Integration Point |
   |--------|------------------|
   | Sentinel-2 imagery | Add adapter in `data/` to fetch NDVI-based forest classification |
   | Google Earth Engine | Add Python Earth Engine API adapter in `data/` |
   | OpenStreetMap Overpass | Query real roads, rivers, settlement boundaries |
   | Government GIS portals | Download shapefiles → convert to GeoJSON with `geopandas` |
   | PostGIS database | Replace `mock_data.py` with SQLAlchemy + PostGIS queries |

4. The analysis engine (`geospatial.py`) works with any valid GeoJSON — no code changes required in the analysis layer.

---

## 🔮 Future Improvements

- [ ] Real satellite data integration (Sentinel-2, Landsat via Google Earth Engine)
- [ ] PostGIS/PostgreSQL database backend for production GIS data
- [ ] User authentication and project saving
- [ ] PDF report generation for stakeholder presentations
- [ ] Multi-modal infrastructure (railways, pipelines, transmission lines)
- [ ] ML-enhanced species habitat prediction
- [ ] Seasonal ecological sensitivity (monsoon, migration corridors)
- [ ] Carbon offset estimation
- [ ] Noise and air quality impact modeling
- [ ] Integration with India's Parivesh/MOEF portal data

---

## 🧪 Running Tests

```bash
# From the project root, with venv activated:
set PYTHONPATH=backend
.\venv\Scripts\pytest backend\tests\
```

All 3 tests validate:
- Geospatial analysis produces valid scores (0–100)
- A* routing generates 3 distinct alternative paths
- Budget optimizer selects optimal route+mitigation within constraints

---

## 📜 License

This is a hackathon prototype for educational and demonstration purposes.

---

**Built with 🌿 for India's forests.**
