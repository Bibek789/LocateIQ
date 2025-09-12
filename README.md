# LocateIQ - AI-Powered Warehouse Optimization Platform

**A comprehensive Flask-based warehouse optimization platform with machine learning integration, interactive mapping, and advanced analytics for supply chain optimization.**

## 🚀 Features

### Core Functionality
- **AI-Powered Optimization**: Multiple optimization algorithms including ML clustering
- **Interactive West Bengal Map**: Real-time visualization with Leaflet.js
- **Advanced Analytics**: Chart.js powered dashboards with comprehensive metrics
- **Multiple Optimization Methods**: Distance, Cost, Capacity, and ML-based optimization
- **Beautiful Animations**: GSAP-powered landing page with smooth scrolling
- **Enhanced Map View**: Full-screen modal for detailed map interaction.
### Machine Learning Integration
- **K-means Clustering**: Intelligent store grouping for optimal warehouse placement
- **Scikit-learn Integration**: Advanced ML algorithms for location optimization
- **Predictive Analytics**: Data-driven insights for supply chain decisions
- **Multi-criteria Optimization**: Balanced approach considering multiple factors

### Advanced Capabilities
- **Real-time Data Processing**: Live optimization calculations
- **Interactive Dashboard**: Multi-section interface with navigation
- **Responsive Design**: Mobile-first approach with modern UI
- **Data Visualization**: Charts, graphs, and interactive maps
- **Store Management**: Complete CRUD operations for retail locations

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computing
- **Scikit-learn**: Machine learning algorithms

### Frontend
- **HTML5/CSS3**: Modern web standards
- **JavaScript ES6+**: Interactive functionality
- **Chart.js**: Data visualization
- **Leaflet.js**: Interactive maps
- **GSAP**: Advanced animations
- **Lenis**: Smooth scrolling

### Data & Analytics
- **CSV Data Storage**: Store and warehouse information
- **Geospatial Analysis**: Location-based calculations
- **Statistical Analysis**: Performance metrics and data visualization
- **Real-time Processing**: Live optimization results

## 📦 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd LocateIQ
   ```
1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask development server**:
   ```bash
   python app.py
   ```

3. **Access the application**:
   - Open your browser and navigate to `http://localhost:5000`
   - The application will be available with all features.

## 🏗️ Project Structure

```
LocateIQ/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── data/
│   ├── stores.csv             # Store location data
│   └── warehouses.csv         # Warehouse information
├── templates/                 # HTML templates
│   ├── index.html             # Landing page
│   ├── dashboard.html         # Main dashboard
│   ├── about.html             # About page
│   ├── services.html          # Services page
│   └── contact.html           # Contact page
├── static/
│   ├── css/
│   │   ├── style.css          # Main styles
│   │   └── dashboard.css      # Dashboard styles
│   ├── js/
│   │   ├── main.js            # Landing page scripts
│   │   └── dashboard.js       # Dashboard functionality
│   └── images/
│       ├── logobest.png       # Logo
│       └── dashboard_screenshot.png
└── README.md                  # This file
```

## 🎯 How to Use

### Landing Page
1. **Explore Features**: Scroll through animated sections showcasing capabilities
2. **Navigate**: Use the navigation bar to explore different sections
3. **Get Started**: Click "Get Started" to access the dashboard

### Dashboard Features

#### 1. **Optimization**
- Select multiple stores from the checkbox list
- Choose optimization method (Distance, Cost, Capacity, ML Clustering)
- Click "Find Optimal Location" to run optimization
- View results in a dedicated panel and on the map with visualized routes.

#### 2. **Analytics Dashboard**
- **Capacity Distribution**: Bar chart showing warehouse capacities
- **Cost Analysis**: Line chart displaying cost trends
- **Connectivity Analysis**: Doughnut chart for connectivity distribution
- **Performance Metrics**: Key statistics and KPIs

#### 3. **Optimization Methods**
- **Distance Optimization**: Minimizes total travel distance.
- **Cost Optimization**: Balances operational and transportation costs
- **Capacity Optimization**: Ensures adequate storage capacity
- **ML Clustering**: Uses K-means for intelligent grouping

#### 4. **Store Management**
- View all store locations in a comprehensive table
- Monitor store status and coordinates
- Manage retail location data

## 🤖 Machine Learning Algorithms

### K-means Clustering
```python
# Standardize coordinates
scaler = StandardScaler()
coordinates_scaled = scaler.fit_transform(coordinates)

# Perform clustering
kmeans = KMeans(n_clusters=n_clusters, random_state=42)
clusters = kmeans.fit_predict(coordinates_scaled)
```

### Distance Optimization
```python
def calculate_distance(lat1, lng1, lat2, lng2):
    return geodesic((lat1, lng1), (lat2, lng2)).kilometers
```

### Cost Optimization Formula
```
Total Cost = Operational Cost + (Distance × ₹50/km)
```

## 📊 API Endpoints

### Data Endpoints
- `GET /api/stores` - Retrieve all store data
- `GET /api/warehouses` - Retrieve all warehouse data
- `GET /api/analytics` - Get analytics data for charts

### Optimization Endpoints
- `POST /api/optimize` - Run optimization algorithms.
  ```json
  {
    "selectedStoreIds": [1, 2, 3],
    "criterion": "distance|cost|capacity|ml_clustering"
  }
  ```

### Utility Endpoints
- `GET /api/map` - Generate interactive map HTML

## 🎨 Design Features

### Color Palette
- **Primary**: `#06b6d4` (Cyan)
- **Secondary**: `#a78bfa` (Purple)
- **Accent**: `#d946ef` (Pink)
- **Background**: `#0b1120` (Dark Navy)
- **Cards**: `#111827` (Dark Gray)

### Typography
- **Primary Font**: Emblema One
- **Logo Font**: Nabla
- **Body Font**: Poppins

### Animations
- **GSAP ScrollTrigger**: Landing page animations
- **Lenis**: Smooth scrolling
- **CSS Transitions**: Interactive elements
- **Chart Animations**: Data visualization effects

## 🔧 Configuration

### Environment Variables
```python
# Flask Configuration
DEBUG = True
PORT = 5000

# Data Configuration
STORES_CSV = 'data/stores.csv'
WAREHOUSES_CSV = 'data/warehouses.csv'
```

### Optimization Parameters
```python
# ML Clustering
N_CLUSTERS = 3
RANDOM_STATE = 42

# Cost Calculation
DISTANCE_COST_PER_KM = 50  # ₹50 per kilometer
```

## 📈 Analytics & Metrics

### Key Performance Indicators
- **Total Warehouses**: 19 locations
- **Total Stores**: 50 retail locations
- **Average Capacity**: 12,000 units
- **Average Cost**: ₹12,500

### Visualization Types
- **Bar Charts**: Capacity distribution
- **Line Charts**: Cost analysis
- **Doughnut Charts**: Connectivity breakdown
- **Interactive Maps**: Geographic visualization
- **Metrics Cards**: KPI displays

## 🌟 Advanced Features

### Real-time Optimization
- Live calculation of optimal warehouse locations
- Dynamic map updates with route visualization
- Interactive result panels with detailed metrics

### Multi-criteria Decision Making
- **Distance Minimization**: Shortest total travel distance
- **Cost Optimization**: Lowest total operational cost
- **Capacity Planning**: Adequate storage for demand
- **ML Intelligence**: Data-driven clustering approach

### Interactive Mapping
- **Store Markers**: Blue markers for retail locations
- **Warehouse Markers**: Red markers for storage facilities
- **Optimal Routes**: Visual connections between locations
- **Highlighted Results**: Gold markers for optimal selections

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask application
python app.py

# Access at http://localhost:5000
```

### Production Deployment
- Configure Flask for production
- Set up proper database connections
- Implement caching for optimization results
- Add authentication and user management

## 🔮 Future Enhancements

### Phase 1: Enhanced ML
- **Deep Learning Models**: Neural networks for complex optimization
- **Reinforcement Learning**: Adaptive optimization strategies
- **Time Series Forecasting**: Demand prediction models
- **Anomaly Detection**: Identify unusual patterns

### Phase 2: Real-world Integration
- **Google Maps API**: Real traffic and routing data
- **Weather API**: Environmental factor integration
- **Economic Data**: Market condition analysis
- **Real Estate API**: Property availability and pricing

### Phase 3: Enterprise Features
- **Multi-tenant Architecture**: Support multiple companies
- **User Authentication**: Role-based access control
- **API Integration**: Connect with ERP/WMS systems
- **Advanced Reporting**: PDF exports and detailed analytics

### Phase 4: Advanced Intelligence
- **Natural Language Processing**: Voice commands and queries
- **Computer Vision**: Satellite imagery analysis
- **IoT Integration**: Real-time sensor data
- **Blockchain**: Supply chain transparency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Scikit-learn**: Machine learning algorithms
- **Flask**: Web framework foundation
- **Leaflet.js**: Interactive mapping capabilities
- **Chart.js**: Data visualization components
- **GSAP**: Animation framework
- **OpenStreetMap**: Map tile services

## 👥 Team

- **Nikita**: Data Scientist (ML) - AI algorithms and optimization
- **Bibek**: Frontend Developer - UI and interactive visualizations
- **Pralay**: Backend Developer - Flask application and APIs
- **Priyanshu**: Cloud Engineer - Infrastructure and deployment
- **Tanisha**: UI/UX Designer - Design and user experience

---

**Transform your supply chain with intelligent warehouse placement powered by machine learning!** 🚀

*Built with ❤️ using Flask, Python, and cutting-edge ML technologies*

## 🚀 Quick Start Guide

1. **Install**: `pip install -r requirements.txt`
2. **Run**: `python app.py`
3. **Explore**: Navigate to `http://localhost:5000`
4. **Optimize**: Go to dashboard and select stores
5. **Analyze**: View results and analytics

**Ready to revolutionize your warehouse network? Start optimizing today!**