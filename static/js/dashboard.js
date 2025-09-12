class DashboardManager {
    constructor() {
        this.map = null;
        this.markers = null;
        this.optimizationLayer = null; // Layer for routes and optimal points
        this.modalMap = null;
        this.stores = [];
        this.warehouses = [];
        this.charts = {};
        this.customLocationMarker = null;
        this.lastOptimizationResult = null; // Store the last result
        this.init();
    }

    async init() {
        this.setupNavigation();
        this.setupMap();
        this.setupModalMap();
        await this.loadData();
        this.setupEventListeners();
        this.loadAnalytics();
        this.populateStoreTable();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');
        const headerTitle = document.getElementById('main-header-title');
        const headerSubtitle = document.getElementById('main-header-subtitle');

        const headerContent = {
            'dashboard': {
                title: 'Warehouse Optimizer',
                subtitle: 'Find the optimal warehouse location for your supply chain'
            },
            'analytics': {
                title: 'Analytics Dashboard',
                subtitle: 'Visualize your supply chain performance and metrics'
            },
            'optimization': {
                title: 'Optimization Methods',
                subtitle: 'Learn about our advanced optimization algorithms'
            },
            'stores': {
                title: 'Store Management',
                subtitle: 'Manage your retail locations and store data'
            }
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = e.target.dataset.section;

                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');

                // Show target section
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(`${targetSection}-section`).classList.add('active');

                // Update header
                if (headerContent[targetSection]) {
                    headerTitle.textContent = headerContent[targetSection].title;
                    headerSubtitle.textContent = headerContent[targetSection].subtitle;
                }

                // Load section-specific content
                if (targetSection === 'analytics') {
                    this.loadAnalytics();
                }
            });
        });
    }

    setupMap() {
        // Initialize map centered on West Bengal
        this.map = L.map('map').setView([22.9868, 87.8550], 8);
        this.optimizationLayer = L.featureGroup().addTo(this.map);
        this.markers = L.featureGroup().addTo(this.map);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
    }

    setupModalMap() {
        this.modalMap = L.map('modal-map').setView([22.9868, 87.8550], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.modalMap);

        const mapModal = document.getElementById('map-modal');
        const expandBtn = document.getElementById('expand-map-btn');
        const closeBtn = document.getElementById('close-map-modal-btn');

        expandBtn.addEventListener('click', () => this.openMapModal());
        closeBtn.addEventListener('click', () => mapModal.classList.add('hidden'));
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) mapModal.classList.add('hidden');
        });
    }

    async loadData() {
        try {
            // Load stores
            const storesResponse = await fetch('/api/stores');
            this.stores = await storesResponse.json();

            // Load warehouses
            const warehousesResponse = await fetch('/api/warehouses');
            this.warehouses = await warehousesResponse.json();

            this.displayMarkersOnMap();
            this.populateStoreCheckboxes();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    displayMarkersOnMap() {
        // Clear existing markers
        this.markers.clearLayers();

        // Add store markers (blue)
        this.stores.forEach(store => {
            const marker = L.marker([store.Latitude, store.Longitude])
                .bindPopup(`<b>Store:</b> ${store.Name}<br><b>City:</b> ${store.City}`);
            this.markers.addLayer(marker);
        });

        // Add warehouse markers (red)
        this.warehouses.forEach(warehouse => {
            const marker = L.marker([warehouse.Latitude, warehouse.Longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                })
            }).bindPopup(`<b>Warehouse:</b> ${warehouse.Name}<br><b>Capacity:</b> ${warehouse.Capacity}<br><b>Cost:</b> ₹${warehouse.Cost}`);
            this.markers.addLayer(marker);
        });

        // Fit map to show all markers
        if (this.markers.getLayers().length > 0) {
            this.map.fitBounds(this.markers.getBounds().pad(0.1));
        }
    }

    populateStoreCheckboxes() {
        const container = document.getElementById('store-checkbox-list');
        if (!container) return;

        container.innerHTML = this.stores.map(store => `
            <div class="checkbox-item">
                <input type="checkbox" class="store-checkbox" value="${store.Store_ID}" id="store-${store.Store_ID}">
                <label for="store-${store.Store_ID}">${store.Name}</label>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Find optimal location button
        const findOptimalBtn = document.getElementById('find-optimal-btn');
        if (findOptimalBtn) {
            findOptimalBtn.addEventListener('click', () => this.findOptimalLocation());
        }

        // Load sample data button
        const loadSampleBtn = document.getElementById('load-sample-btn');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => this.loadSampleData());
        }

        // Add custom location button
        const addCustomLocationBtn = document.getElementById('add-custom-location-btn');
        if (addCustomLocationBtn) {
            addCustomLocationBtn.addEventListener('click', () => this.addCustomLocation());
        }

        // Map modal buttons
        const expandMapBtn = document.getElementById('expand-map-btn');
        if (expandMapBtn) expandMapBtn.addEventListener('click', () => this.openMapModal());

        const closeMapModalBtn = document.getElementById('close-map-modal-btn');
        if (closeMapModalBtn) closeMapModalBtn.addEventListener('click', () => document.getElementById('map-modal').classList.add('hidden'));
    }

    loadSampleData() {
        // Select first 5 stores as sample
        const checkboxes = document.querySelectorAll('.store-checkbox');
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = index < 5;
        });
        
        // Show notification
        this.showNotification('Sample data loaded! 5 stores selected for optimization.');
    }

    openMapModal() {
        const mapModal = document.getElementById('map-modal');
        mapModal.classList.remove('hidden');

        // Invalidate map size to ensure it renders correctly in the modal
        setTimeout(() => {
            this.modalMap.invalidateSize();
            // Add base markers and any existing optimization layers to the modal map
            this.markers.addTo(this.modalMap);
            this.optimizationLayer.addTo(this.modalMap);

            // Fit bounds to all visible layers
            const allBounds = L.featureGroup([...this.markers.getLayers(), ...this.optimizationLayer.getLayers()]).getBounds();
            if (allBounds.isValid()) {
                this.modalMap.fitBounds(allBounds.pad(0.1));
            }
        }, 10);
    }

    addCustomLocation() {
        const latInput = document.getElementById('custom-lat');
        const lngInput = document.getElementById('custom-lng');
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.showNotification('Please enter valid latitude (-90 to 90) and longitude (-180 to 180).', 'error');
            return;
        }

        // Remove previous custom marker if it exists
        if (this.customLocationMarker) {
            this.map.removeLayer(this.customLocationMarker);
            if (this.modalMap.hasLayer(this.customLocationMarker)) this.modalMap.removeLayer(this.customLocationMarker);
        }

        // Add a new marker for the custom location
        this.customLocationMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            })
        }).addTo(this.map).bindPopup('<b>Your Custom Location</b>').openPopup();

        // Also add to modal map if it's open
        if (!document.getElementById('map-modal').classList.contains('hidden')) {
            this.customLocationMarker.addTo(this.modalMap);
        }

        // Center the map on the new marker
        this.map.setView([lat, lng], 10);

        this.showNotification('Custom location added to the map!');

        // Clear inputs
        latInput.value = '';
        lngInput.value = '';
    }

    async findOptimalLocation() {
        const selectedCheckboxes = document.querySelectorAll('.store-checkbox:checked');
        const selectedStoreIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        const criterion = document.getElementById('optimization-criterion').value;

        if (selectedStoreIds.length === 0) {
            this.showNotification('Please select at least one store.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedStoreIds,
                    criterion
                })
            });

            const result = await response.json();
            this.lastOptimizationResult = result; // Save the result
            this.displayOptimizationResults(result);
        } catch (error) {
            console.error('Error finding optimal location:', error);
            this.showNotification('Error finding optimal location. Please try again.', 'error');
        }
    }

    displayOptimizationResults(result) {
        const resultsPanel = document.getElementById('results-panel');
        const resultsContainer = document.getElementById('optimization-results');

        if (!resultsPanel || !resultsContainer) return;

        let resultsHTML = '';

        if (result.criterion === 'ml_clustering') {
            // Handle ML clustering results
            resultsHTML = `
                <h3>🤖 ML Clustering Results</h3>
                <p><strong>Algorithm:</strong> K-means clustering with ${result.warehouses.length} clusters</p>
                <div class="clustering-results">
                    ${result.warehouses.map((warehouse, index) => `
                        <div class="cluster-result">
                            <h4>Cluster ${index + 1} - ${warehouse.Name}</h4>
                            <p><strong>Location:</strong> ${warehouse.City}</p>
                            <p><strong>Capacity:</strong> ${warehouse.Capacity.toLocaleString()} units</p>
                            <p><strong>Cost:</strong> ₹${warehouse.Cost.toLocaleString()}</p>
                            <p><strong>Distance to Center:</strong> ${warehouse.Cluster_Center_Distance} km</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Handle single warehouse results
            const warehouse = result.warehouse;
            resultsHTML = `
                <h3>🎯 Optimal Warehouse Found</h3>
                <div class="warehouse-result">
                    <h4>${warehouse.Name}</h4>
                    <p><strong>Location:</strong> ${warehouse.City}</p>
                    <p><strong>Optimization Criterion:</strong> ${result.criterion}</p>
                    <p><strong>Total Distance:</strong> ${warehouse.Total_Distance} km</p>
                    <p><strong>Capacity:</strong> ${warehouse.Capacity.toLocaleString()} units</p>
                    <p><strong>Cost:</strong> ₹${warehouse.Cost.toLocaleString()}</p>
                    ${warehouse.Total_Cost ? `<p><strong>Total Cost:</strong> ₹${warehouse.Total_Cost.toLocaleString()}</p>` : ''}
                    ${warehouse.Capacity_Utilization ? `<p><strong>Capacity Utilization:</strong> ${warehouse.Capacity_Utilization}%</p>` : ''}
                </div>
                <div class="selected-stores">
                    <h4>Selected Stores (${result.selected_stores.length})</h4>
                    <p>${result.selected_stores.map(store => store.Name).join(', ')}</p>
                </div>
            `;
        }

        resultsContainer.innerHTML = resultsHTML;
        resultsPanel.classList.remove('hidden');

        // Update map visualization
        this.visualizeOptimizationResults();
    }

    visualizeOptimizationResults() {
        // Clear only the previous optimization layer, not all markers
        this.optimizationLayer.clearLayers();

        const result = this.lastOptimizationResult;
        if (!result) return;

        if (result.criterion === 'ml_clustering') {
            // Highlight recommended warehouses
            result.warehouses.forEach((warehouse, index) => {
                
                const marker = L.marker([warehouse.Latitude, warehouse.Longitude], {
                    icon: L.icon({
                        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    })
                }).bindPopup(`<b>Recommended Warehouse:</b> ${warehouse.Name}<br><b>Cluster:</b> ${index + 1}`);
                this.optimizationLayer.addLayer(marker);
            });
        } else {
            // Handle single warehouse results
            const warehouse = result.warehouse;
            const marker = L.marker([warehouse.Latitude, warehouse.Longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                })
            }).bindPopup(`<b>Optimal Warehouse:</b> ${warehouse.Name}`);
            this.markers.addLayer(marker);

            // Draw lines from warehouse to selected stores
            result.selected_stores.forEach(store => {
                const polyline = L.polyline([
                    [warehouse.Latitude, warehouse.Longitude],
                    [store.Latitude, store.Longitude]
                ], { color: 'blue', weight: 2, opacity: 0.7 });
                this.optimizationLayer.addLayer(polyline);
            });
        }

        // Create a temporary group to calculate bounds
        const allVisibleLayers = L.featureGroup([
            ...this.markers.getLayers(),
            ...this.optimizationLayer.getLayers()
        ]);

        // Fit map to show all relevant points
        this.map.fitBounds(allVisibleLayers.getBounds().pad(0.1));
        this.modalMap.fitBounds(allVisibleLayers.getBounds().pad(0.1));
    }

    closeMapModal() {
        document.getElementById('map-modal').classList.add('hidden');
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();

            this.createCapacityChart(data.capacity_distribution);
            this.createCostChart(data.cost_distribution);
            this.createConnectivityChart(data.connectivity_analysis);
            this.updateMetrics();
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    createCapacityChart(data) {
        const ctx = document.getElementById('capacityChart');
        if (!ctx) return;

        if (this.charts.capacity) {
            this.charts.capacity.destroy();
        }

        this.charts.capacity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Capacity (units)',
                    data: data.values,
                    backgroundColor: 'rgba(6, 182, 212, 0.8)',
                    borderColor: 'rgba(6, 182, 212, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#cbd5e1'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cbd5e1'
                        },
                        grid: {
                            color: 'rgba(203, 213, 225, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#cbd5e1',
                            maxRotation: 45
                        },
                        grid: {
                            color: 'rgba(203, 213, 225, 0.1)'
                        }
                    }
                }
            }
        });
    }

    createCostChart(data) {
        const ctx = document.getElementById('costChart');
        if (!ctx) return;

        if (this.charts.cost) {
            this.charts.cost.destroy();
        }

        this.charts.cost = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Cost (₹)',
                    data: data.values,
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    borderColor: 'rgba(168, 85, 247, 1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#cbd5e1'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cbd5e1'
                        },
                        grid: {
                            color: 'rgba(203, 213, 225, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#cbd5e1',
                            maxRotation: 45
                        },
                        grid: {
                            color: 'rgba(203, 213, 225, 0.1)'
                        }
                    }
                }
            }
        });
    }

    createConnectivityChart(data) {
        const ctx = document.getElementById('connectivityChart');
        if (!ctx) return;

        if (this.charts.connectivity) {
            this.charts.connectivity.destroy();
        }

        this.charts.connectivity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(251, 191, 36, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#cbd5e1'
                        }
                    }
                }
            }
        });
    }

    updateMetrics() {
        document.getElementById('total-warehouses').textContent = this.warehouses.length;
        document.getElementById('total-stores').textContent = this.stores.length;
        
        const avgCapacity = this.warehouses.reduce((sum, w) => sum + w.Capacity, 0) / this.warehouses.length;
        document.getElementById('avg-capacity').textContent = Math.round(avgCapacity).toLocaleString();
        
        const avgCost = this.warehouses.reduce((sum, w) => sum + w.Cost, 0) / this.warehouses.length;
        document.getElementById('avg-cost').textContent = `₹${Math.round(avgCost).toLocaleString()}`;
    }

    populateStoreTable() {
        const tableBody = document.querySelector('#stores-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = this.stores.map(store => `
            <tr>
                <td>${store.Name}</td>
                <td>${store.City}</td>
                <td>${store.Latitude.toFixed(4)}, ${store.Longitude.toFixed(4)}</td>
                <td><span class="status-pill active">Active</span></td>
            </tr>
        `).join('');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc2626' : '#06b6d4'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});