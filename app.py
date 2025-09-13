from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import folium
import plotly.graph_objs as go
import plotly.utils
import json
from geopy.distance import geodesic
import os

app = Flask(__name__)
CORS(app)

# Define required columns
required_store_cols = ['Store_ID', 'Name', 'Latitude', 'Longitude', 'City']
required_warehouse_cols = ['Warehouse_ID', 'Name', 'Latitude', 'Longitude', 'Cost', 'Connectivity', 'Capacity', 'Ownership', 'City']

# Load data
try:
    stores_df = pd.read_csv('data/stores.csv')
    warehouses_df = pd.read_csv('data/warehouses.csv')
    
    # Basic data validation
    if not all(col in stores_df.columns for col in required_store_cols):
        raise ValueError("Missing required columns in stores.csv")
        
    if not all(col in warehouses_df.columns for col in required_warehouse_cols):
        raise ValueError("Missing required columns in warehouses.csv")

except FileNotFoundError as e:
    print(f"Error loading data file: {e}")
    # Create empty dataframes as a fallback
    stores_df = pd.DataFrame(columns=required_store_cols)
    warehouses_df = pd.DataFrame(columns=required_warehouse_cols)

except ValueError as e:
    print(f"Data validation error: {e}")
    # Create empty dataframes as a fallback
    stores_df = pd.DataFrame(columns=required_store_cols)
    warehouses_df = pd.DataFrame(columns=required_warehouse_cols)

class WarehouseOptimizer:
    def __init__(self, stores_df, warehouses_df):
        self.stores_df = stores_df
        self.warehouses_df = warehouses_df
        
    def calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two points using geodesic distance"""
        return geodesic((lat1, lng1), (lat2, lng2)).kilometers
    
    def optimize_by_distance(self, selected_store_ids):
        """Find warehouse that minimizes total distance to selected stores"""
        selected_stores = self.stores_df[self.stores_df['Store_ID'].isin(selected_store_ids)]
        
        best_warehouse = None
        min_total_distance = float('inf')
        
        for _, warehouse in self.warehouses_df.iterrows():
            total_distance = 0
            distances = []
            
            for _, store in selected_stores.iterrows():
                distance = self.calculate_distance(
                    warehouse['Latitude'], warehouse['Longitude'],
                    store['Latitude'], store['Longitude']
                )
                total_distance += distance
                distances.append(distance)
            
            if total_distance < min_total_distance:
                min_total_distance = total_distance
                best_warehouse = warehouse.to_dict()
                best_warehouse['Total_Distance'] = round(total_distance, 2)
                best_warehouse['Individual_Distances'] = distances
        
        return {
            'warehouse': best_warehouse,
            'selected_stores': selected_stores.to_dict('records'),
            'criterion': 'distance',
            'total_distance': min_total_distance
        }
    
    def optimize_by_cost(self, selected_store_ids):
        """Find warehouse that minimizes cost considering distance and operational cost"""
        selected_stores = self.stores_df[self.stores_df['Store_ID'].isin(selected_store_ids)]
        
        best_warehouse = None
        min_cost_score = float('inf')
        
        for _, warehouse in self.warehouses_df.iterrows():
            total_distance = 0
            
            for _, store in selected_stores.iterrows():
                distance = self.calculate_distance(
                    warehouse['Latitude'], warehouse['Longitude'],
                    store['Latitude'], store['Longitude']
                )
                total_distance += distance
            
            # Cost score = operational cost + distance penalty
            distance_cost = total_distance * 50  # ₹50 per km
            total_cost = warehouse['Cost'] + distance_cost
            
            if total_cost < min_cost_score:
                min_cost_score = total_cost
                best_warehouse = warehouse.copy()
                best_warehouse['Total_Distance'] = round(total_distance, 2)
                best_warehouse['Total_Cost'] = round(total_cost, 2)
        
        return {
            'warehouse': best_warehouse.to_dict(),
            'selected_stores': selected_stores.to_dict('records'),
            'criterion': 'cost',
            'total_cost': min_cost_score
        }
    
    def optimize_by_capacity(self, selected_store_ids):
        """Find warehouse with optimal capacity for selected stores"""
        selected_stores = self.stores_df[self.stores_df['Store_ID'].isin(selected_store_ids)]
        total_demand = len(selected_stores) * 100  # Assume 100 units per store
        
        suitable_warehouses = self.warehouses_df[self.warehouses_df['Capacity'] >= total_demand]
        
        if suitable_warehouses.empty:
            # If no warehouse has enough capacity, find the one with maximum capacity
            suitable_warehouses = self.warehouses_df.nlargest(1, 'Capacity')
        
        best_warehouse = None
        min_total_distance = float('inf')
        
        for _, warehouse in suitable_warehouses.iterrows():
            total_distance = 0
            
            for _, store in selected_stores.iterrows():
                distance = self.calculate_distance(
                    warehouse['Latitude'], warehouse['Longitude'],
                    store['Latitude'], store['Longitude']
                )
                total_distance += distance
            
            if total_distance < min_total_distance:
                min_total_distance = total_distance
                best_warehouse = warehouse.to_dict()
                best_warehouse['Total_Distance'] = round(total_distance, 2)
                best_warehouse['Capacity_Utilization'] = round((total_demand / warehouse['Capacity']) * 100, 2)
        
        return {
            'warehouse': best_warehouse,
            'selected_stores': selected_stores.to_dict('records'),
            'criterion': 'capacity',
            'total_distance': min_total_distance,
            'required_capacity': total_demand
        }
    
    def ml_clustering_optimization(self, selected_store_ids, n_clusters=3):
        """Use ML clustering to find optimal warehouse locations"""
        selected_stores = self.stores_df[self.stores_df['Store_ID'].isin(selected_store_ids)]
        
        if len(selected_stores) < n_clusters:
            n_clusters = len(selected_stores)
        
        # Prepare data for clustering
        coordinates = selected_stores[['Latitude', 'Longitude']].values
        
        # Standardize coordinates
        scaler = StandardScaler()
        coordinates_scaled = scaler.fit_transform(coordinates)
        
        # Perform K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
        clusters = kmeans.fit_predict(coordinates_scaled)
        
        # Get cluster centers in original scale
        cluster_centers = scaler.inverse_transform(kmeans.cluster_centers_)
        
        # Find best warehouse for each cluster center
        recommended_warehouses = []
        
        for i, center in enumerate(cluster_centers):
            center_lat, center_lng = center
            
            # Find closest warehouse to cluster center
            min_distance = float('inf')
            best_warehouse = None
            
            for _, warehouse in self.warehouses_df.iterrows():
                distance = self.calculate_distance(
                    center_lat, center_lng,
                    warehouse['Latitude'], warehouse['Longitude']
                )
                
                if distance < min_distance:
                    min_distance = distance
                    best_warehouse = warehouse.to_dict()
                    best_warehouse['Cluster_Center_Distance'] = round(distance, 2)
                    best_warehouse['Cluster_ID'] = i
            
            recommended_warehouses.append(best_warehouse)
        
        return {
            'warehouses': recommended_warehouses,
            'selected_stores': selected_stores.to_dict('records'),
            'clusters': clusters.tolist(),
            'cluster_centers': cluster_centers.tolist(),
            'criterion': 'ml_clustering'
        }

optimizer = WarehouseOptimizer(stores_df, warehouses_df)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/services')
def services():
    return render_template('services.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/api/stores')
def get_stores():
    return jsonify(stores_df.to_dict('records'))

@app.route('/api/warehouses')
def get_warehouses():
    return jsonify(warehouses_df.to_dict('records'))

@app.route('/api/optimize', methods=['POST'])
def optimize_warehouse():
    try:
        data = request.json
        selected_store_ids = data['selectedStoreIds']
        criterion = data.get('criterion', 'distance')
        demand_per_store = data.get('demand_per_store', 100)
        distance_cost_per_km = data.get('distance_cost_per_km', 50)
        
        if not selected_store_ids:
            return jsonify({'error': 'No stores selected'}), 400
        
        if criterion == 'distance':
            result = optimizer.optimize_by_distance(selected_store_ids)
        elif criterion == 'cost':
            result = optimizer.optimize_by_cost(selected_store_ids, distance_cost_per_km=distance_cost_per_km)
        elif criterion == 'capacity':
            result = optimizer.optimize_by_capacity(selected_store_ids, demand_per_store=demand_per_store)
        elif criterion == 'ml_clustering':
            result = optimizer.ml_clustering_optimization(selected_store_ids)
        else:
            return jsonify({'error': 'Invalid optimization criterion'}), 400
        
        return jsonify(result)
    except (KeyError, TypeError):
        return jsonify({'error': 'Invalid request format'}), 400
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/api/analytics')
def get_analytics():
    try:
        # Warehouse capacity distribution
        capacity_data = {
            'labels': warehouses_df['Name'].tolist(),
            'values': warehouses_df['Capacity'].tolist()
        }
        
        # Cost distribution
        cost_data = {
            'labels': warehouses_df['Name'].tolist(),
            'values': warehouses_df['Cost'].tolist()
        }
        
        # Connectivity analysis
        connectivity_counts = warehouses_df['Connectivity'].value_counts()
        connectivity_data = {
            'labels': connectivity_counts.index.tolist(),
            'values': connectivity_counts.values.tolist()
        }
        
        # Geographic distribution
        geo_data = {
            'warehouses': warehouses_df[['Name', 'Latitude', 'Longitude', 'Capacity', 'Cost']].to_dict('records'),
            'stores': stores_df[['Name', 'Latitude', 'Longitude']].to_dict('records')
        }
        
        return jsonify({
            'capacity_distribution': capacity_data,
            'cost_distribution': cost_data,
            'connectivity_analysis': connectivity_data,
            'geographic_data': geo_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/map')
def generate_map():
    try:
        # Create a map centered on West Bengal
        m = folium.Map(location=[22.9868, 87.8550], zoom_start=8)
        
        # Add store markers (blue)
        for _, store in stores_df.iterrows():
            folium.Marker(
                [store['Latitude'], store['Longitude']],
                popup=f"<b>Store:</b> {store['Name']}<br><b>City:</b> {store['City']}",
                icon=folium.Icon(color='blue', icon='info-sign')
            ).add_to(m)
        
        # Add warehouse markers (red)
        for _, warehouse in warehouses_df.iterrows():
            folium.Marker(
                [warehouse['Latitude'], warehouse['Longitude']],
                popup=f"<b>Warehouse:</b> {warehouse['Name']}<br><b>Capacity:</b> {warehouse['Capacity']}<br><b>Cost:</b> ₹{warehouse['Cost']}",
                icon=folium.Icon(color='red', icon='home')
            ).add_to(m)
        
        return m._repr_html_()
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)