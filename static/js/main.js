import * as L from 'leaflet'

let map;
let nodes = [];
let edges = [];
let markers = {};
let polylines = {};
let startNode = null;
let endNode = null;
let shortestPath = [];
let pathPolyline = null;

let resultDiv;
let findPathBtn;
let resetBtn;

function initMap() {
  map = L.map('map').setView([20.5937, 78.9629], 5); // Centered on India

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  map.on('click', (e) => {
    document.getElementById('nodeLat').value = e.latlng.lat.toFixed(4);
    document.getElementById('nodeLng').value = e.latlng.lng.toFixed(4);
  });
}

function generateId() {
  return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getMarkerIcon(type, isStart = false, isEnd = false) {
  let color;

  if (isStart) {
    color = 'green';
  } else if (isEnd) {
    color = 'red';
  } else {
    switch (type) {
      case 'warehouse':
        color = 'blue';
        break;
      case 'store':
        color = 'orange';
        break;
      case 'junction':
        color = 'gray';
        break;
      default:
        color = 'blue';
    }
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function addNode(name, type, lat, lng) {
  const id = generateId();
  const node = { id, name, type, lat, lng };
  nodes.push(node);

  const marker = L.marker([lat, lng], { icon: getMarkerIcon(type) })
    .addTo(map)
    .bindPopup(`<h4>${name}</h4><p>Type: ${type}</p><p>Lat: ${lat}</p><p>Lng: ${lng}</p>`);

  marker.on('click', () => handleMarkerClick(id));

  markers[id] = marker;

  updateNodeSelectors();
  updateNodesList();
  return id;
}

function removeNode(id) {
  nodes = nodes.filter(n => n.id !== id);
  edges = edges.filter(e => e.from !== id && e.to !== id);

  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }

  Object.keys(polylines).forEach(key => {
    if (key.includes(id)) {
      map.removeLayer(polylines[key]);
      delete polylines[key];
    }
  });

  if (startNode === id) startNode = null;
  if (endNode === id) endNode = null;
  shortestPath = [];

  updateNodeSelectors();
  updateNodesList();
  drawEdges();
}

function addEdge(from, to, weight) {
  edges.push({ from, to, weight: parseFloat(weight) });
  drawEdges();
}

function drawEdges() {
  Object.values(polylines).forEach(line => map.removeLayer(line));
  polylines = {};

  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) return;

    const key = `${edge.from}-${edge.to}`;
    const line = L.polyline(
      [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
      { color: '#cbd5e0', weight: 3, opacity: 0.7 }
    ).addTo(map);

    const midLat = (fromNode.lat + toNode.lat) / 2;
    const midLng = (fromNode.lng + toNode.lng) / 2;

    L.marker([midLat, midLng], {
      icon: L.divIcon({
        className: 'distance-label',
        html: `<div style="background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 11px; font-weight: bold; white-space: nowrap;">${edge.weight} km</div>`,
        iconSize: [50, 20],
        iconAnchor: [25, 10]
      })
    }).addTo(map);

    polylines[key] = line;
  });
}

function handleMarkerClick(nodeId) {
  const node = nodes.find(n => n.id === nodeId);

  if (!startNode) {
    if (node.type !== 'warehouse') {
      resultDiv.textContent = 'Please select a WAREHOUSE as the starting point!';
      resultDiv.className = 'error';
      return;
    }
    startNode = nodeId;
    markers[nodeId].setIcon(getMarkerIcon(node.type, true, false));
    resultDiv.textContent = `Warehouse selected: ${node.name}. Now select a STORE as destination.`;
    resultDiv.className = '';
  } else if (!endNode && nodeId !== startNode) {
    if (node.type !== 'store') {
      resultDiv.textContent = 'Please select a STORE as the destination!';
      resultDiv.className = 'error';
      return;
    }
    endNode = nodeId;
    markers[nodeId].setIcon(getMarkerIcon(node.type, false, true));
    resultDiv.textContent = `Store selected: ${node.name}. Click "Find Shortest Route" to calculate.`;
    resultDiv.className = '';
  } else if (nodeId === startNode || nodeId === endNode) {
    if (nodeId === startNode) {
      markers[nodeId].setIcon(getMarkerIcon(node.type, false, false));
      startNode = null;
    }
    if (nodeId === endNode) {
      markers[nodeId].setIcon(getMarkerIcon(node.type, false, false));
      endNode = null;
    }
    shortestPath = [];
    if (pathPolyline) {
      map.removeLayer(pathPolyline);
      pathPolyline = null;
    }
    resultDiv.textContent = 'Selection cleared. Click on a warehouse to start again.';
    resultDiv.className = '';
  }
}

function updateNodeSelectors() {
  const fromSelect = document.getElementById('fromNode');
  const toSelect = document.getElementById('toNode');

  fromSelect.innerHTML = '<option value="">Select location...</option>';
  toSelect.innerHTML = '<option value="">Select location...</option>';

  nodes.forEach(node => {
    const option1 = document.createElement('option');
    option1.value = node.id;
    option1.textContent = `${node.name} (${node.type})`;
    fromSelect.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = node.id;
    option2.textContent = `${node.name} (${node.type})`;
    toSelect.appendChild(option2);
  });
}

function updateNodesList() {
  const nodesList = document.getElementById('nodesList');
  nodesList.innerHTML = '';

  nodes.forEach(node => {
    const div = document.createElement('div');
    div.className = `node-item ${node.type}`;
    div.innerHTML = `
      <span>${node.name}</span>
      <button onclick="window.removeNodeById('${node.id}')">Delete</button>
    `;
    nodesList.appendChild(div);
  });
}

window.removeNodeById = function(id) {
  removeNode(id);
};

function buildGraph() {
  const graph = {};
  nodes.forEach(node => {
    graph[node.id] = {};
  });

  edges.forEach(edge => {
    graph[edge.from][edge.to] = edge.weight;
    graph[edge.to][edge.from] = edge.weight;
  });

  return graph;
}

function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  distances[start] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        current = nodeId;
      }
    });

    if (current === null || current === end) break;

    unvisited.delete(current);

    Object.keys(graph[current]).forEach(neighbor => {
      if (unvisited.has(neighbor)) {
        const distance = distances[current] + graph[current][neighbor];
        if (distance < distances[neighbor]) {
          distances[neighbor] = distance;
          previous[neighbor] = current;
        }
      }
    });
  }

  const path = [];
  let current = end;

  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    path: path[0] === start ? path : [],
    distance: distances[end]
  };
}

function drawShortestPath(path) {
  if (pathPolyline) {
    map.removeLayer(pathPolyline);
  }

  if (path.length > 0) {
    const latLngs = path.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return [node.lat, node.lng];
    });

    pathPolyline = L.polyline(latLngs, {
      color: '#28a745',
      weight: 5,
      opacity: 0.9
    }).addTo(map);

    map.fitBounds(pathPolyline.getBounds(), { padding: [50, 50] });
  }
}

function initializeApp() {
  // Initialize element variables after DOM is loaded
  resultDiv = document.getElementById('result');
  findPathBtn = document.getElementById('findPath');
  resetBtn = document.getElementById('reset');

  document.getElementById('addNode').addEventListener('click', () => {
    const name = document.getElementById('nodeName').value.trim();
    const type = document.getElementById('nodeType').value;
    const lat = parseFloat(document.getElementById('nodeLat').value);
    const lng = parseFloat(document.getElementById('nodeLng').value);

    if (!name || isNaN(lat) || isNaN(lng)) {
      alert('Please fill in all fields with valid values!');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Invalid coordinates! Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    addNode(name, type, lat, lng);

    document.getElementById('nodeName').value = '';
    document.getElementById('nodeLat').value = '';
    document.getElementById('nodeLng').value = '';

    resultDiv.textContent = `${name} added successfully!`;
    resultDiv.className = '';
  });

  document.getElementById('addEdge').addEventListener('click', () => {
    const from = document.getElementById('fromNode').value;
    const to = document.getElementById('toNode').value;
    const weight = document.getElementById('edgeWeight').value;

    if (!from || !to || !weight) {
      alert('Please fill in all fields!');
      return;
    }

    if (from === to) {
      alert('Cannot create a route from a location to itself!');
      return;
    }

    addEdge(from, to, weight);

    document.getElementById('edgeWeight').value = '';

    resultDiv.textContent = 'Route added successfully!';
    resultDiv.className = '';
  });

  document.getElementById('loadSample').addEventListener('click', () => {
    nodes = [];
    edges = [];
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
    Object.values(polylines).forEach(line => map.removeLayer(line));
    polylines = {};
    if (confirm('This will clear the current map and load data from the CSV files. Continue?')) {
      // Clear existing data
      nodes = [];
      edges = [];
      Object.values(markers).forEach(marker => map.removeLayer(marker));
      markers = {};
      Object.values(polylines).forEach(line => map.removeLayer(line));
      polylines = {};

    // Sample data based on warehouse and store locations in India
    const sampleNodes = [
      { name: 'Warehouse Mumbai', type: 'warehouse', lat: 19.0760, lng: 72.8777 },
      { name: 'Warehouse Delhi', type: 'warehouse', lat: 28.7041, lng: 77.1025 },
      { name: 'Warehouse Bangalore', type: 'warehouse', lat: 12.9716, lng: 77.5946 },
      { name: 'Store Pune', type: 'store', lat: 18.5204, lng: 73.8567 },
      { name: 'Store Jaipur', type: 'store', lat: 26.9124, lng: 75.7873 },
      { name: 'Store Chennai', type: 'store', lat: 13.0827, lng: 80.2707 },
      { name: 'Junction Nagpur', type: 'junction', lat: 21.1458, lng: 79.0882 },
      { name: 'Junction Hyderabad', type: 'junction', lat: 17.3850, lng: 78.4867 }
    ];
      resultDiv.textContent = 'Loading data from CSV files...';
      resultDiv.className = '';

    const nodeIds = {};
    sampleNodes.forEach(node => {
      const id = addNode(node.name, node.type, node.lat, node.lng);
      nodeIds[node.name] = id;
    });

    // Sample edges connecting the locations
    const sampleEdges = [
      { from: 'Warehouse Mumbai', to: 'Store Pune', weight: 150 },
      { from: 'Warehouse Mumbai', to: 'Junction Nagpur', weight: 850 },
      { from: 'Warehouse Delhi', to: 'Store Jaipur', weight: 270 },
      { from: 'Warehouse Delhi', to: 'Junction Nagpur', weight: 1080 },
      { from: 'Warehouse Bangalore', to: 'Store Chennai', weight: 350 },
      { from: 'Warehouse Bangalore', to: 'Junction Hyderabad', weight: 570 },
      { from: 'Junction Nagpur', to: 'Junction Hyderabad', weight: 500 },
      { from: 'Junction Hyderabad', to: 'Store Chennai', weight: 630 }
    ];

    sampleEdges.forEach(edge => {
      addEdge(nodeIds[edge.from], nodeIds[edge.to], edge.weight);
    });

    startNode = null;
    endNode = null;
    shortestPath = [];

    map.setView([20.5937, 78.9629], 5); // Centered on India

    resultDiv.textContent = 'Sample India network loaded! Click on a warehouse and then a store to find the route.';
    resultDiv.className = '';
      fetch('/api/locations')
        .then(response => response.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          data.forEach(location => {
            addNode(location.Name, location.type, location.Latitude, location.Longitude);
          });
          resultDiv.textContent = `Successfully loaded ${data.length} locations from CSV files.`;
          resultDiv.className = 'success';
          map.setView([20.5937, 78.9629], 5); // Recenter on India
        })
        .catch(error => {
          resultDiv.textContent = `Error loading data: ${error.message}`;
          resultDiv.className = 'error';
        });
    }
  });

  document.getElementById('clearAll').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data?')) {
      nodes = [];
      edges = [];
      startNode = null;
      endNode = null;
      shortestPath = [];

      Object.values(markers).forEach(marker => map.removeLayer(marker));
      markers = {};

      Object.values(polylines).forEach(line => map.removeLayer(line));
      polylines = {};

      if (pathPolyline) {
        map.removeLayer(pathPolyline);
        pathPolyline = null;
      }

      updateNodeSelectors();
      updateNodesList();

      resultDiv.textContent = 'All data cleared.';
      resultDiv.className = '';
    }
  });

  findPathBtn.addEventListener('click', () => {
    if (!startNode || !endNode) {
      resultDiv.textContent = 'Please select both a warehouse and a store!';
      resultDiv.className = 'error';
      return;
    }

    const startNodeObj = nodes.find(n => n.id === startNode);
    const endNodeObj = nodes.find(n => n.id === endNode);

    const graph = buildGraph();
    const result = dijkstra(graph, startNode, endNode);

    if (result.path.length === 0 || result.distance === Infinity) {
      resultDiv.textContent = 'No route found between these locations!';
      resultDiv.className = 'error';
      shortestPath = [];
      if (pathPolyline) {
        map.removeLayer(pathPolyline);
        pathPolyline = null;
      }
    } else {
      shortestPath = result.path;
      drawShortestPath(result.path);

      // --- LLM Integration ---
      resultDiv.textContent = 'Fetching route insights from AI...';
      resultDiv.className = '';

      const payload = {
        start: { lat: startNodeObj.lat, lng: startNodeObj.lng },
        end: { lat: endNodeObj.lat, lng: endNodeObj.lng }
      };

      fetch('/api/route_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error);
        }

        // Safely extract the AI's message content
        let aiContent = data.route_info;
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          aiContent = data.choices[0].message.content;
        } else if (typeof data.route_info === 'object') {
          // If route_info is an object but not the expected format, stringify it for display.
          aiContent = JSON.stringify(data.route_info, null, 2);
        }

        const pathNames = result.path.map(id => nodes.find(n => n.id === id).name).join(' → ');
        let llmResponse;
        try {
          llmResponse = JSON.parse(aiContent);
        } catch (e) {
          llmResponse = { "Raw Response": aiContent };
        }

        resultDiv.innerHTML = `<strong>Route:</strong> ${pathNames}<br><strong>Distance:</strong> ${result.distance} km<br><hr><strong>AI Insights:</strong><br><strong>Est. Distance:</strong> ${llmResponse.estimated_distance || 'N/A'}<br><strong>Est. Cost:</strong> ${llmResponse.average_travel_cost || 'N/A'}<br><strong>Traffic:</strong> ${llmResponse.current_traffic_condition || 'N/A'}<br><strong>Weather:</strong> ${llmResponse.current_weather_condition || 'N/A'}`;
        resultDiv.className = 'success';
      })
      .catch(error => {
        resultDiv.textContent = `Could not fetch AI insights: ${error.message}`;
        resultDiv.className = 'error';
      });
    }
  });

  resetBtn.addEventListener('click', () => {
    if (startNode) {
      const startNodeObj = nodes.find(n => n.id === startNode);
      markers[startNode].setIcon(getMarkerIcon(startNodeObj.type, false, false));
    }
    if (endNode) {
      const endNodeObj = nodes.find(n => n.id === endNode);
      markers[endNode].setIcon(getMarkerIcon(endNodeObj.type, false, false));
    }

    startNode = null;
    endNode = null;
    shortestPath = [];

    if (pathPolyline) {
      map.removeLayer(pathPolyline);
      pathPolyline = null;
    }

    resultDiv.textContent = '';
    resultDiv.className = '';
  });

  const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
  if (getCurrentLocationBtn) {
    getCurrentLocationBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        resultDiv.textContent = 'Geolocation is not supported by your browser.';
        resultDiv.className = 'error';
        return;
      }

      resultDiv.textContent = 'Fetching your location...';
      resultDiv.className = '';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('nodeLat').value = position.coords.latitude.toFixed(4);
          document.getElementById('nodeLng').value = position.coords.longitude.toFixed(4);
          resultDiv.textContent = 'Location fetched! You can now add it as a node.';
          resultDiv.className = 'success';
        },
        () => {
          resultDiv.textContent = 'Unable to retrieve your location. Please ensure location services are enabled.';
          resultDiv.className = 'error';
        }
      );
    });
  }

  initMap();
  updateNodeSelectors();
  updateNodesList();
}

document.addEventListener('DOMContentLoaded', initializeApp);
