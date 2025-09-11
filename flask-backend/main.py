from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

import pandas as pd
from geopy.distance import geodesic

app = Flask(__name__)
CORS(app)

# Load CSVs
stores = pd.read_csv("stl.csv")
warehouses = pd.read_csv("wll.csv")   # make sure this file exists

# Function: find nearest warehouse
def find_optimal_warehouse_for_stores(store_ids, criterion):
    selected_stores = stores[stores["Store_ID"].isin(store_ids)]
    if selected_stores.empty:
        return None, None
    
    results = []

    for _, wh in warehouses.iterrows():
        wh_coords = (wh["Latitude"], wh["Longitude"])
        wh_info = {
            "Name": wh["Name"],
            "City": wh["City"],
            "Cost": float(wh["Cost"]),
            "Capacity": int(wh["Capacity"])
        }
        
        total_dist = 0
        for _, store in selected_stores.iterrows():
            store_coords = (store["Latitude"], store["Longitude"])
            total_dist += geodesic(store_coords, wh_coords).km

        wh_info["Total_Distance"] = round(total_dist, 2)
        wh_info["Warehouse_ID"] = int(wh["Warehouse_ID"])
        wh_info["Latitude"] = float(wh["Latitude"])
        wh_info["Longitude"] = float(wh["Longitude"])
        results.append(wh_info)

    # Sort based on criterion
    if criterion == "distance":
        results.sort(key=lambda x: x["Total_Distance"])
    elif criterion == "cost":
        results.sort(key=lambda x: x["Cost"])
    elif criterion == "capacity":
        results.sort(key=lambda x: -x["Capacity"])
    else:
        results.sort(key=lambda x: x["Total_Distance"])  # default: distance

    return selected_stores.to_dict(orient="records"), results[0]

@app.route("/")
def index():
    return render_template("dashboard.html", stores=stores.to_dict(orient="records"))

@app.route("/optimal_warehouse", methods=["POST"])
def optimal_warehouse():
    data = request.get_json()
    store_ids = data.get("selectedStoreIds", [])
    criterion = data.get("optimizationCriterion", "distance")

    if not store_ids:
        return jsonify({"error": "No store selected"}), 400

    selected_stores, optimal = find_optimal_warehouse_for_stores(store_ids, criterion)
    if not optimal:
        return jsonify({"error": "No result"}), 404

    return jsonify({
        "selectedStores": selected_stores,
        "optimalWarehouse": optimal
    })

@app.route("/api/locations", methods=["GET"])
def get_locations():
    return jsonify({
        "stores": stores.to_dict(orient="records"),
        "warehouses": warehouses.to_dict(orient="records")
    })


if __name__ == '__main__':
    app.run(debug=True, port=8080)