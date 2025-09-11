import axios from 'axios';

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav a');
    const contentSections = {
        'Dashboard': document.getElementById('dashboard-content'),
        'Store Management': document.getElementById('store-management-content'),
        'Analytics': document.getElementById('analytics-content')
    };
    const mainHeaderTitle = document.getElementById('main-header-title');
    const mainHeaderSubtitle = document.getElementById('main-header-subtitle');

    const headerContent = {
        'Dashboard': {
            title: 'Warehouse Optimizer',
            subtitle: 'Find the optimal warehouse location for your supply chain'
        },
        'Store Management': {
            title: 'Store Management',
            subtitle: 'Add, edit, or remove your store locations'
        },
        'Analytics': {
            title: 'Analytics',
            subtitle: 'Visualize your supply chain performance'
        }
    };

    function switchView(viewName) {
        // Update header
        if (mainHeaderTitle && headerContent[viewName]) {
            mainHeaderTitle.textContent = headerContent[viewName].title;
            mainHeaderSubtitle.textContent = headerContent[viewName].subtitle;
        }

        // Hide all sections
        for (const section of Object.values(contentSections)) {
            if (section) section.style.display = 'none';
        }

        // Show the target section
        if (contentSections[viewName]) {
            // Use 'grid' for sections with a grid layout, 'block' for others
            const displayStyle = viewName === 'Dashboard' ? 'grid' : 'block';
            contentSections[viewName].style.display = displayStyle;
        }

        // Update active link
        navLinks.forEach(link => {
            if (link.textContent === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.textContent;
            switchView(viewName);
        });
    });
}

function createStoreCheckboxes(stores) {
    const list = document.getElementById('store-checkbox-list');
    if (!list) return;
    list.innerHTML = stores.map(store => `
        <div class="checkbox-item">
            <input type="checkbox" class="store-checkbox" value="${store.ID}" id="store-${store.ID}">
            <label for="store-${store.ID}">${store.Name}</label>
        </div>`).join('');
}

async function fetchAndDisplayMapData(map, markers) {
    try {
        const response = await axios.get('http://localhost:8080/api/locations');
        const { stores, warehouses } = response.data;
        console.log('Successfully fetched locations:', { stores, warehouses });

        // Clear existing markers
        markers.clearLayers();

        // Add store markers (blue)
        stores.forEach(store => {
            const marker = L.marker([store.Latitude, store.Longitude])
                .bindPopup(`<b>Store:</b> ${store.Name}<br><b>City:</b> ${store.City}`);
            markers.addLayer(marker);
        });

        // Add warehouse markers (red)
        warehouses.forEach(warehouse => {
            const marker = L.marker([warehouse.Latitude, warehouse.Longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                })
            }).bindPopup(`<b>Warehouse:</b> ${warehouse.Name}<br><b>City:</b> ${warehouse.City}`);
            markers.addLayer(marker);
        });

        // Adjust map to show all markers
        if (markers.getLayers().length > 0) {
            map.fitBounds(markers.getBounds().pad(0.1));
        }

        // Populate store selection checkboxes
        createStoreCheckboxes(stores);
    } catch (error) {
        console.error('Failed to fetch and display map data:', error);
    }
}

function setupMap() {
    const map = L.map('map').setView([22.5726, 88.3639], 7);
    const markers = L.featureGroup().addTo(map);

    // Add a tile layer to the map (e.g., OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    return { map, markers };
}
function setupUserLocation(map) {
    // --- Current Location ---
    const currentLocationBtn = document.getElementById('current-location-btn');

    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const userLatLng = [latitude, longitude];
                        console.log('User location found:', userLatLng);

                        let userLocationMarker = window.userLocationMarker;
                        // Remove previous user location marker if it exists
                        if (userLocationMarker) {
                            map.removeLayer(userLocationMarker);
                        }

                        // Add a new marker for the user's location
                        userLocationMarker = L.marker(userLatLng, {
                            icon: L.icon({ // A distinct icon for the user
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                            })
                        }).addTo(map).bindPopup('<b>You are here</b>').openPopup();
                        
                        window.userLocationMarker = userLocationMarker;
                        // Center the map on the user's location
                        map.setView(userLatLng, 13); // Zoom in closer
                    },
                    () => {
                        alert('Could not get your location. Please ensure location services are enabled and permission is granted.');
                    }
                );
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        });
    }
}

function setupOptimization(map, markers) {
    let routePolyline;

    const findOptimalBtn = document.getElementById('find-optimal-btn');
    if (findOptimalBtn) {
        findOptimalBtn.addEventListener('click', async () => {
            const selectedStoreCheckboxes = document.querySelectorAll('.store-checkbox:checked');
            const selectedStoreIds = Array.from(selectedStoreCheckboxes).map(cb => parseInt(cb.value));
            const optimizationCriterion = document.getElementById('optimization-criterion').value;

            if (selectedStoreIds.length === 0) {
                alert('Please select at least one store.');
                return;
            }

            try {
                const response = await axios.post('http://localhost:8080/optimal_warehouse', {
                    selectedStoreIds,
                    optimizationCriterion
                });

                const { selectedStores, optimalWarehouse } = response.data;
                console.log('Optimal warehouse found:', { selectedStores, optimalWarehouse });

                // Clear previous route
                if (routePolyline) {
                    map.removeLayer(routePolyline);
                }

                // --- Update Results Panel ---
                const resultsPanel = document.getElementById('results-panel');
                const warehouseInfo = document.getElementById('warehouse-info');
                const storeInfo = document.getElementById('store-info');

                // Display store info
                const storeNames = selectedStores.map(s => s.Name).join(', ');
                storeInfo.innerHTML = `
                    <p class="font-semibold text-gray-700">Selected Stores</p>
                    <p class="text-sm text-gray-500">${storeNames}</p>
                `;

                // Display warehouse info
                warehouseInfo.innerHTML = `
                    <p class="font-semibold text-gray-700">Optimal Warehouse</p>
                    <p class="text-sm text-gray-600">Name: ${optimalWarehouse.Name}</p>
                    <p class="text-sm text-gray-600">City: ${optimalWarehouse.City}</p>
                    <p class="text-sm text-gray-600">Total Distance: ${optimalWarehouse.Total_Distance} km</p>
                    <p class="text-sm text-gray-600">Cost: ₹${optimalWarehouse.Cost.toLocaleString()}</p>
                    <p class="text-sm text-gray-600">Capacity: ${optimalWarehouse.Capacity.toLocaleString()} units</p>
                `;

                resultsPanel.classList.remove('hidden');

                // --- Update Map ---
                const warehouseLatLng = [optimalWarehouse.Latitude, optimalWarehouse.Longitude];
                const allPoints = selectedStores.map(s => [s.Latitude, s.Longitude]);
                allPoints.push(warehouseLatLng);

                // Create polylines from warehouse to each store
                const latlngs = [];
                selectedStores.forEach(store => {
                    latlngs.push([
                        [optimalWarehouse.Latitude, optimalWarehouse.Longitude],
                        [store.Latitude, store.Longitude]
                    ]);
                });

                routePolyline = L.polyline(latlngs, { color: 'blue', weight: 2, opacity: 0.7 }).addTo(map);

                // Highlight the optimal warehouse marker
                markers.eachLayer(layer => {
                    const popupContent = layer.getPopup().getContent();
                    if (popupContent.includes(`<b>Warehouse:</b> ${optimalWarehouse.Name}`)) {
                        // Use a different icon or color to highlight
                        layer.setIcon(L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                        }));
                        layer.openPopup();
                    }
                });

                // Fit map to show all selected stores and the optimal warehouse
                const bounds = L.latLngBounds(allPoints);
                map.fitBounds(bounds.pad(0.2));

            } catch (error) {
                console.error('Error finding optimal warehouse:', error);
                alert('Could not find the optimal warehouse. Please check the console for details.');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    const { map, markers } = setupMap();

    // Store some variables globally if they need to be accessed by multiple functions
    window.userLocationMarker = null;

    // Initial data fetch for the map
    fetchAndDisplayMapData(map, markers);

    setupUserLocation(map);
    setupOptimization(map, markers);

    switchView('Dashboard'); // Set initial view
});
