import streamlit as st
import pandas as pd
import numpy as np
import pathlib

# --- Page Configuration ---
st.set_page_config(
    page_title="LocateIQ Demand Forecasting",
    page_icon="📈",
    layout="wide"
)

# --- Helper Functions ---

@st.cache_data
def load_data():
    """Loads all necessary data from CSV files."""
    # Use pathlib to create absolute paths to the data files
    base_path = pathlib.Path(__file__).parent
    try:
        stores_df = pd.read_csv(base_path / 'data/stores.csv')
        warehouses_df = pd.read_csv(base_path / 'data/warehouses.csv')
        sales_df = pd.read_csv(base_path / 'data/historical_sales.csv', parse_dates=['Date'])
        inventory_df = pd.read_csv(base_path / 'data/inventory.csv')

        # Create a unified locations dataframe
        stores_df['Location_Type'] = 'store'
        # Convert integer IDs to string IDs (e.g., 1 -> 'S1')
        stores_df['Location_ID'] = 'S' + stores_df['Store_ID'].astype(str)
        warehouses_df['Location_Type'] = 'warehouse'
        # Convert integer IDs to string IDs (e.g., 1 -> 'W1')
        warehouses_df['Location_ID'] = 'W' + warehouses_df['Warehouse_ID'].astype(str)
        
        locations_df = pd.concat([
            stores_df[['Location_ID', 'Name', 'Location_Type']],
            warehouses_df[['Location_ID', 'Name', 'Location_Type']]
        ]).reset_index(drop=True)

        return locations_df, sales_df, inventory_df
    except FileNotFoundError as e:
        st.error(f"Error loading data: {e}. Make sure the following files exist in the 'data/' directory: 'stores.csv', 'warehouses.csv', 'historical_sales.csv', 'inventory.csv'")
        return None, None, None

def simple_forecast(series, window=4, forecast_horizon=4):
    """
    Generates a simple forecast using a rolling mean.
    """
    if len(series) < window:
        return pd.Series(dtype=np.float64) # Not enough data to forecast
    
    rolling_mean = series.rolling(window=window).mean().iloc[-1]
    forecast = np.full(forecast_horizon, rolling_mean)
    return pd.Series(forecast, index=[series.index[-1] + pd.DateOffset(weeks=i+1) for i in range(forecast_horizon)])

# --- Main Application ---

st.title("📈 LocateIQ - Inventory & Demand Forecasting")
st.markdown("Analyze historical sales data to forecast future demand and identify potential inventory shortages.")

locations_df, sales_df, inventory_df = load_data()

if locations_df is not None:
    # --- Sidebar for Filters ---
    st.sidebar.header("Filters")
    
    # Location filter
    location_names = locations_df['Name'].unique()
    selected_location_name = st.sidebar.selectbox("Select a Location (Store or Warehouse):", location_names)
    
    selected_location = locations_df[locations_df['Name'] == selected_location_name].iloc[0]
    selected_location_id = selected_location['Location_ID']
    selected_location_type = selected_location['Location_Type']

    # Item filter
    available_items = inventory_df[inventory_df['Location_ID'] == selected_location_id]['Item_Name'].unique()
    if available_items.size > 0:
        selected_item_name = st.sidebar.selectbox("Select an Item:", available_items)
        selected_item_id = inventory_df[(inventory_df['Item_Name'] == selected_item_name) & (inventory_df['Location_ID'] == selected_location_id)]['Item_ID'].iloc[0]
    else:
        st.warning(f"No items found for location: {selected_location_name}")
        st.stop()

    st.sidebar.info(f"Displaying forecast for **{selected_item_name}** at **{selected_location_name}**.")

    # --- Data Filtering ---
    location_sales = sales_df[
        (sales_df['Location_ID'] == selected_location_id) &
        (sales_df['Item_ID'] == selected_item_id)
    ].set_index('Date')['Units_Sold']

    current_inventory = inventory_df[
        (inventory_df['Location_ID'] == selected_location_id) &
        (inventory_df['Item_ID'] == selected_item_id)
    ]['Current_Stock'].iloc[0]

    # --- Forecasting ---
    if not location_sales.empty:
        forecast_series = simple_forecast(location_sales, window=4, forecast_horizon=4)
        
        # Combine historical and forecast data for charting
        chart_data = pd.DataFrame({
            'Historical Sales': location_sales,
            'Forecasted Demand': forecast_series
        })

        # --- Display Results ---
        col1, col2 = st.columns([2, 1])

        with col1:
            st.header("Demand Forecast")
            st.line_chart(chart_data)

        with col2:
            st.header("Forecast Data")
            st.dataframe(forecast_series.rename("Forecasted Units").astype(int), use_container_width=True)
            st.metric(label="Current Stock", value=f"{current_inventory} units")

        # --- Shortage Analysis ---
        st.header("Inventory Shortage Analysis")
        
        if not forecast_series.empty:
            cumulative_demand = forecast_series.cumsum()
            shortage_df = pd.DataFrame({
                'Forecasted Demand': forecast_series.astype(int),
                'Cumulative Demand': cumulative_demand.astype(int),
                'Stock After Demand': current_inventory - cumulative_demand.astype(int)
            })
            shortage_df['Status'] = shortage_df['Stock After Demand'].apply(lambda x: "⚠️ Shortage Risk" if x < 0 else "✅ OK")
            
            # Highlight shortage rows
            def highlight_shortage(s):
                return ['background-color: #ffc7ce; color: #9c0006' if 'Shortage' in s.Status else '' for _ in s]

            st.dataframe(shortage_df.style.apply(highlight_shortage, axis=1), use_container_width=True)

            # Summary
            first_shortage = shortage_df[shortage_df['Stock After Demand'] < 0]
            if not first_shortage.empty:
                shortage_date = first_shortage.index[0].strftime('%Y-%m-%d')
                st.error(f"**Alert:** A potential stock shortage for **{selected_item_name}** is predicted around **{shortage_date}**.")
            else:
                st.success(f"**Good News:** Current stock of **{selected_item_name}** seems sufficient for the next 4 weeks.")
        else:
            st.info("Not enough historical data to perform shortage analysis.")

    else:
        st.warning(f"No historical sales data found for **{selected_item_name}** at **{selected_location_name}**.")

else:
    st.error("Failed to load data. Please check the console for errors.")