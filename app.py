from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import folium
from geopy.distance import geodesic
import os
import requests
from dotenv import load_dotenv
import heapq
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from scipy.spatial import cKDTree
import polyline

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
CORS(app)

# ------------------- Data Loading -------------------
required_store_cols = ['Store_ID', 'Name', 'Latitude', 'Longitude', 'City']
required_warehouse_cols = ['Warehouse_ID', 'Name', 'Latitude', 'Longitude', 'Cost', 'Connectivity', 'Capacity', 'Ownership', 'City']

try:
    stores_df = pd.read_csv('data/stores.csv')
    warehouses_df = pd.read_csv('data/warehouses.csv')

    if not all(col in stores_df.columns for col in required_store_cols):
        raise ValueError("Missing required columns in stores.csv")
    if not all(col in warehouses_df.columns for col in required_warehouse_cols):
        raise ValueError("Missing required columns in warehouses.csv")

except Exception as e:
    print(f"Data load error: {e}")
    stores_df = pd.DataFrame(columns=required_store_cols)
    warehouses_df = pd.DataFrame(columns=required_warehouse_cols)


# ------------------- Optimizer Class -------------------
class WarehouseOptimizer:
    def __init__(self, stores_df, warehouses_df):
        self.stores_df = stores_df
        self.warehouses_df = warehouses_df

    def calculate_distance(self, lat1, lng1, lat2, lng2):
        return geodesic((lat1, lng1), (lat2, lng2)).kilometers


optimizer = WarehouseOptimizer(stores_df, warehouses_df)


# ------------------- Routing Infrastructure -------------------

class OSRMRouter:
    """OSRM-based routing service for real road-following paths"""
    
    def __init__(self, base_url="http://router.project-osrm.org"):
        self.base_url = base_url
        
    def route(self, coordinates, steps=True):
        """Get route from OSRM service"""
        try:
            # Format coordinates as "lng,lat;lng,lat"
            coord_string = ";".join([f"{coord[1]},{coord[0]}" for coord in coordinates])
            
            url = f"{self.base_url}/route/v1/driving/{coord_string}"
            params = {
                "steps": str(steps).lower(),
                "geometries": "polyline6",
                "overview": "full"
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"OSRM routing error: {e}")
            return None
    
    def table(self, coordinates):
        """Get distance/duration matrix from OSRM"""
        try:
            coord_string = ";".join([f"{coord[1]},{coord[0]}" for coord in coordinates])
            
            url = f"{self.base_url}/table/v1/driving/{coord_string}"
            params = {
                "sources": ";".join([str(i) for i in range(len(coordinates))]),
                "destinations": ";".join([str(i) for i in range(len(coordinates))])
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"OSRM table error: {e}")
            return None

# Initialize OSRM router
osrm_router = OSRMRouter()

class RoadGraph:
    """Simple in-memory road graph for routing"""
    def __init__(self):
        self.nodes = {}  # {node_id: {lat, lon}}
        self.edges = {}  # {node_id: [{v, distance_m, travel_time_s, name, geometry}]}
        self.kdtree = None
        self.node_coords = []
        self.node_ids = []
        
    def add_node(self, node_id, lat, lon):
        self.nodes[node_id] = {'lat': lat, 'lon': lon}
        
    def add_edge(self, u, v, distance_m, travel_time_s=None, name="", geometry=None):
        if travel_time_s is None:
            # Estimate travel time: 30 km/h average speed in urban areas
            travel_time_s = (distance_m / 1000) * 3600 / 30
            
        if u not in self.edges:
            self.edges[u] = []
        self.edges[u].append({
            'v': v,
            'distance_m': distance_m,
            'travel_time_s': travel_time_s,
            'name': name,
            'geometry': geometry or []
        })
        
    def build_kdtree(self):
        """Build KD-tree for fast nearest neighbor queries"""
        self.node_coords = [(self.nodes[nid]['lat'], self.nodes[nid]['lon']) for nid in self.nodes]
        self.node_ids = list(self.nodes.keys())
        if self.node_coords:
            self.kdtree = cKDTree(self.node_coords)
        return self.kdtree is not None
        
    def find_nearest_node(self, lat, lon):
        """Find nearest road node to given coordinates"""
        if not self.kdtree:
            return None
            
        _, idx = self.kdtree.query([(lat, lon)])
        return self.node_ids[idx[0]]


def dijkstra(graph, source, target, weight='travel_time_s'):
    """Dijkstra's algorithm for shortest path finding"""
    if source not in graph.nodes or target not in graph.nodes:
        return None, None
        
    pq = [(0, source, [])]  # (distance, node, path_edges)
    seen = {}
    
    while pq:
        dist_u, u, path = heapq.heappop(pq)
        
        if u == target:
            return dist_u, path
            
        if u in seen and seen[u] <= dist_u:
            continue
            
        seen[u] = dist_u
        
        for edge in graph.edges.get(u, []):
            v = edge['v']
            w = edge[weight]
            heapq.heappush(pq, (dist_u + w, v, path + [edge]))
            
    return None, None


def compute_ai_insights(route, vehicle=None, traffic=None):
    """Compute AI insights for a route"""
    distance_km = route['distance_m'] / 1000
    duration_hours = route['duration_s'] / 3600
    
    # ETA calculation (current time + duration)
    eta = datetime.now() + timedelta(seconds=route['duration_s'])
    
    # Fuel cost estimation
    estimated_fuel_cost_inr = 0
    if vehicle:
        if 'mpg' in vehicle:
            # Convert MPG to liters per km
            liters_per_km = (3.78541 / 1.60934) / vehicle['mpg']  # Convert to metric
        elif 'l_per_km' in vehicle:
            liters_per_km = vehicle['l_per_km']
        else:
            liters_per_km = 0.08  # Default: 8 liters per 100km
            
        fuel_price = vehicle.get('fuel_price_inr_per_l', 100)  # Default ₹100/liter
        estimated_fuel_cost_inr = distance_km * liters_per_km * fuel_price
    
    # Congestion score (0-1, where 1 is most congested)
    congestion_score = 0.5  # Default moderate congestion
    if traffic:
        congestion_score = traffic.get('score', 0.5)
    else:
        # Heuristic: if travel time is much longer than expected, assume congestion
        expected_time = distance_km * 60 / 50  # 50 km/h expected speed
        actual_time = duration_hours * 60
        if actual_time > expected_time * 1.5:
            congestion_score = min(0.8, (actual_time - expected_time) / expected_time)
        elif actual_time < expected_time * 0.8:
            congestion_score = 0.2
    
    # Route confidence
    route_confidence = True
    notes = []
    
    if distance_km < 0.1:  # Very short routes
        notes.append("Very short route - may not need vehicle")
        route_confidence = False
    elif congestion_score > 0.7:
        notes.append("High congestion expected")
    elif distance_km > 100:
        notes.append("Long distance route - consider breaks")
        
    if not traffic:
        notes.append("Traffic data not available - used heuristics")
    
    return {
        "eta": eta.isoformat(),
        "distance_km": round(distance_km, 2),
        "estimated_fuel_cost_inr": round(estimated_fuel_cost_inr, 2),
        "congestion_score": round(congestion_score, 2),
        "route_confidence": route_confidence,
        "notes": notes
    }


def generate_real_turn_by_turn(osrm_legs):
    """Generate real turn-by-turn navigation from OSRM data"""
    if not osrm_legs:
        return []
        
    steps = []
    
    for leg in osrm_legs:
        for step in leg.get('steps', []):
            maneuver = step.get('maneuver', {})
            instruction = step.get('maneuver', {}).get('instruction', '')
            
            # Clean up instruction text
            if instruction:
                # Remove HTML tags and clean up text
                import re
                instruction = re.sub(r'<[^>]+>', '', instruction)
                instruction = instruction.replace('&nbsp;', ' ')
                instruction = instruction.strip()
            
            if not instruction:
                instruction = "Continue straight"
            
            steps.append({
                "instruction": instruction,
                "maneuver": maneuver.get('type', 'continue'),
                "distance_m": step.get('distance', 0),
                "duration_s": step.get('duration', 0),
                "geometry": step.get('geometry', [])
            })
    
    return steps


def generate_turn_by_turn(leg_edges):
    """Generate turn-by-turn navigation steps from edge sequence (legacy)"""
    if not leg_edges:
        return []
        
    steps = []
    current_road = None
    
    # Depart step
    if leg_edges:
        first_edge = leg_edges[0]
        steps.append({
            "instruction": f"Depart from {first_edge.get('name', 'current location')}",
            "maneuver": "depart",
            "distance_m": 0,
            "duration_s": 0,
            "geometry": []
        })
        current_road = first_edge.get('name', '')
    
    # Process route segments
    for i, edge in enumerate(leg_edges):
        edge_name = edge.get('name', '')
        
        # Determine maneuver type
        maneuver = "continue"
        instruction = f"Continue on {edge_name}" if edge_name else "Continue straight"
        
        if i > 0 and edge_name != current_road:
            # Road change detected - determine turn direction
            prev_edge = leg_edges[i-1]
            # Simple heuristic: assume right turn for demonstration
            maneuver = "turn-right"
            instruction = f"Turn right onto {edge_name}" if edge_name else "Turn right"
            
        steps.append({
            "instruction": instruction,
            "maneuver": maneuver,
            "distance_m": edge['distance_m'],
            "duration_s": edge['travel_time_s'],
            "geometry": edge.get('geometry', [])
        })
        
        current_road = edge_name
    
    # Arrive step
    if leg_edges:
        last_edge = leg_edges[-1]
        steps.append({
            "instruction": f"Arrive at destination",
            "maneuver": "arrive",
            "distance_m": 0,
            "duration_s": 0,
            "geometry": []
        })
    
    return steps


def optimize_route_order(waypoints, road_graph):
    """Simple nearest neighbor + 2-opt for multi-stop optimization"""
    if len(waypoints) <= 2:
        return [wp['id'] for wp in waypoints]
    
    # For now, use simple nearest neighbor
    # In production, integrate OR-Tools VRP solver
    remaining = waypoints[1:]  # Keep first waypoint fixed
    optimized_order = [waypoints[0]['id']]
    current = waypoints[0]
    
    while remaining:
        nearest_idx = 0
        min_distance = float('inf')
        
        for i, wp in enumerate(remaining):
            dist = geodesic(
                (current['lat'], current['lng']),
                (wp['lat'], wp['lng'])
            ).kilometers
            
            if dist < min_distance:
                min_distance = dist
                nearest_idx = i
        
        current = remaining.pop(nearest_idx)
        optimized_order.append(current['id'])
    
    return optimized_order


# Initialize road graph with sample data
road_graph = RoadGraph()

# Add some sample nodes for Indian cities
sample_nodes = [
    (1, 19.0760, 72.8777, "Mumbai"),  # Mumbai
    (2, 28.7041, 77.1025, "Delhi"),   # Delhi
    (3, 12.9716, 77.5946, "Bangalore"), # Bangalore
    (4, 22.5726, 88.3639, "Kolkata"), # Kolkata
    (5, 18.5204, 73.8567, "Pune"),    # Pune
]

for node_id, lat, lon, name in sample_nodes:
    road_graph.add_node(node_id, lat, lon)
    
    # Add bidirectional edges to other cities (simplified)
    for other_id, other_lat, other_lon, other_name in sample_nodes:
        if node_id != other_id:
            distance = geodesic((lat, lon), (other_lat, other_lon)).kilometers * 1000  # Convert to meters
            road_graph.add_edge(node_id, other_id, distance, name=f"{name} to {other_name}")
            road_graph.add_edge(other_id, node_id, distance, name=f"{other_name} to {name}")

road_graph.build_kdtree()


# ------------------- Routes -------------------

@app.route('/')
def index():
    # Create base map centered on average coordinates
    if not stores_df.empty:
        center_lat = stores_df['Latitude'].mean()
        center_lon = stores_df['Longitude'].mean()
    else:
        center_lat, center_lon = 20.5937, 78.9629  # India center

    m = folium.Map(location=[center_lat, center_lon], zoom_start=5)
    m.add_child(folium.LatLngPopup())  # Show lat/lon on click
    map_html = m._repr_html_()
    return render_template('index.html', map_html=map_html)


@app.route('/api/route', methods=['POST'])
def get_route():
    """New comprehensive routing endpoint with AI insights"""
    try:
        data = request.json
        waypoints = data.get("waypoints", [])
        optimize = data.get("optimize", False)
        vehicle = data.get("vehicle", {})

        if len(waypoints) < 2:
            return jsonify({"error": "At least 2 waypoints required"}), 400

        # Map-match waypoints to road graph nodes
        matched_waypoints = []
        for wp in waypoints:
            nearest_node = road_graph.find_nearest_node(wp['lat'], wp['lng'])
            if nearest_node:
                matched_waypoints.append({
                    'id': wp['id'],
                    'lat': wp['lat'],
                    'lng': wp['lng'],
                    'name': wp.get('name', f"Waypoint {wp['id']}"),
                    'node_id': nearest_node
                })
            else:
                return jsonify({"error": f"Could not find road for waypoint {wp['id']}"}), 400

        # Optimize route order if requested
        if optimize and len(matched_waypoints) > 2:
            optimized_order = optimize_route_order(matched_waypoints, road_graph)
            # Reorder waypoints according to optimization
            waypoint_dict = {wp['id']: wp for wp in matched_waypoints}
            matched_waypoints = [waypoint_dict[wp_id] for wp_id in optimized_order]
        else:
            optimized_order = [wp['id'] for wp in matched_waypoints]

        # Calculate route legs using real road-following paths
        legs = []
        total_distance = 0
        total_duration = 0
        all_geometry = []

        for i in range(len(matched_waypoints) - 1):
            start_wp = matched_waypoints[i]
            end_wp = matched_waypoints[i + 1]
            
            # Use OSRM for real road-following routing
            coordinates = [(start_wp['lat'], start_wp['lng']), (end_wp['lat'], end_wp['lng'])]
            osrm_result = osrm_router.route(coordinates, steps=True)
            
            if osrm_result and osrm_result.get('routes'):
                route = osrm_result['routes'][0]
                leg_distance = route['distance']  # in meters
                leg_duration = route['duration']  # in seconds
                
                total_distance += leg_distance
                total_duration += leg_duration
                
                # Decode polyline geometry
                leg_geometry = []
                if 'geometry' in route:
                    try:
                        # Decode polyline6 to get actual road geometry
                        decoded_geometry = polyline.decode(route['geometry'], 6)
                        leg_geometry = [[lat, lng] for lat, lng in decoded_geometry]
                    except:
                        # Fallback to straight line if polyline decoding fails
                        leg_geometry = [[start_wp['lat'], start_wp['lng']], [end_wp['lat'], end_wp['lng']]]
                else:
                    leg_geometry = [[start_wp['lat'], start_wp['lng']], [end_wp['lat'], end_wp['lng']]]
                
                all_geometry.extend(leg_geometry)
                
                # Generate real turn-by-turn steps from OSRM
                steps = generate_real_turn_by_turn(route.get('legs', []))
                
                legs.append({
                    "from": {"id": start_wp['id'], "lat": start_wp['lat'], "lng": start_wp['lng'], "name": start_wp['name']},
                    "to": {"id": end_wp['id'], "lat": end_wp['lat'], "lng": end_wp['lng'], "name": end_wp['name']},
                    "distance_m": leg_distance,
                    "duration_s": leg_duration,
                    "steps": steps,
                    "geometry": leg_geometry
                })
            else:
                # Fallback to straight line if OSRM fails
                straight_distance = geodesic(
                    (start_wp['lat'], start_wp['lng']),
                    (end_wp['lat'], end_wp['lng'])
                ).kilometers * 1000
                
                straight_duration = straight_distance * 3.6 / 50  # Assume 50 km/h average
                
                total_distance += straight_distance
                total_duration += straight_duration
                
                fallback_geometry = [[start_wp['lat'], start_wp['lng']], [end_wp['lat'], end_wp['lng']]]
                all_geometry.extend(fallback_geometry)
                
                legs.append({
                    "from": {"id": start_wp['id'], "lat": start_wp['lat'], "lng": start_wp['lng'], "name": start_wp['name']},
                    "to": {"id": end_wp['id'], "lat": end_wp['lat'], "lng": end_wp['lng'], "name": end_wp['name']},
                    "distance_m": straight_distance,
                    "duration_s": straight_duration,
                    "steps": [{"instruction": "Follow road from " + start_wp['name'] + " to " + end_wp['name'], "maneuver": "continue", "distance_m": straight_distance, "duration_s": straight_duration}],
                    "geometry": fallback_geometry,
                    "status": "straight_line_fallback"
                })

        # Create route summary
        route = {
            "geometry": all_geometry,
            "encoded_polyline": "",  # Could implement polyline encoding here
            "distance_m": total_distance,
            "duration_s": total_duration
        }

        # Compute AI insights
        ai_insights = compute_ai_insights(route, vehicle)

        # Add human-readable summary from Groq if API key is available
        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if GROQ_API_KEY:
            try:
                start_name = matched_waypoints[0]['name']
                end_name = matched_waypoints[-1]['name']
                prompt = f"""
                Provide a brief, friendly summary for a route from {start_name} to {end_name}.
                Distance: {ai_insights['distance_km']} km
                Estimated time: {ai_insights['eta']}
                Fuel cost: ₹{ai_insights['estimated_fuel_cost_inr']}
                Congestion: {ai_insights['congestion_score']}/1.0
                
                Return a short, encouraging message (max 100 words).
                """

                headers = {
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }

                payload = {
                    "model": "openai/gpt-oss-20b",
                    "input": prompt
                }

                response = requests.post(
                    "https://api.groq.com/openai/v1/responses",
                    headers=headers,
                    json=payload,
                    timeout=5
                )

                if response.status_code == 200:
                    groq_response = response.json()
                    if "output" in groq_response and len(groq_response["output"]) > 0:
                        content = groq_response["output"][0].get("content", "")
                        # Extract just the text if it's in a complex format
                        if isinstance(content, list) and len(content) > 0:
                            content = content[0].get("text", str(content))
                        ai_insights["human_summary"] = content
            except:
                pass  # Gracefully handle Groq API failures

        return jsonify({
            "route": route,
            "legs": legs,
            "order": optimized_order,
            "ai_insights": ai_insights
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/route_info', methods=['POST'])
def get_route_info():
    """Legacy endpoint - Send coordinates to Groq API to generate route insights"""
    try:
        data = request.json
        start = data.get("start")
        end = data.get("end")

        if not start or not end:
            return jsonify({"error": "Start and end coordinates required"}), 400

        prompt = f"""
        You are a travel assistant AI.
        Given the route from {start} to {end}, provide:
        1. Estimated distance (in km)
        2. Average travel cost (in INR)
        3. Current traffic condition (light, moderate, or heavy)
        4. Current weather condition along the route.
        Answer briefly and clearly in structured JSON format.
        """

        GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not GROQ_API_KEY:
            return jsonify({"error": "GROQ_API_KEY environment variable not set."}), 500

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "openai/gpt-oss-20b",  # Groq model from docs
            "input": prompt
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/responses",  # Correct endpoint
            headers=headers,
            json=payload
        )

        response.raise_for_status()

        groq_response = response.json()
        result_text = ""

        # Groq API returns output inside output[0].content
        if "output" in groq_response and len(groq_response["output"]) > 0:
            result_text = groq_response["output"][0].get("content", "")

        return jsonify({"route_info": result_text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/locations')
def get_locations():
    """Get all locations from CSV files"""
    try:
        locations = []
        
        # Add warehouses
        for _, warehouse in warehouses_df.iterrows():
            locations.append({
                'id': f"warehouse_{warehouse['Warehouse_ID']}",
                'name': warehouse['Name'],
                'type': 'warehouse',
                'lat': warehouse['Latitude'],
                'lng': warehouse['Longitude'],
                'city': warehouse['City'],
                'capacity': warehouse['Capacity'],
                'cost': warehouse['Cost'],
                'connectivity': warehouse['Connectivity'],
                'ownership': warehouse['Ownership']
            })
        
        # Add stores
        for _, store in stores_df.iterrows():
            locations.append({
                'id': f"store_{store['Store_ID']}",
                'name': store['Name'],
                'type': 'store',
                'lat': store['Latitude'],
                'lng': store['Longitude'],
                'city': store['City']
            })
        
        return jsonify(locations)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/optimization')
def optimization_page():
    return render_template('optimization.html')


# ------------------- Run Server -------------------
if __name__ == '__main__':
    app.run(debug=True, port=8000)
