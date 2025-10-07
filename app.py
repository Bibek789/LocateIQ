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


@app.route('/api/route_info', methods=['POST'])
def get_route_info():
    """Send coordinates to Groq API to generate route insights"""
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


@app.route('/optimization')
def optimization_page():
    return render_template('optimization.html')


# ------------------- Run Server -------------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
