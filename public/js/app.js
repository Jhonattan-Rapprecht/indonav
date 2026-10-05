const map = L.map("map").setView([51.44083, 5.47778], 13);
const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
});
tileLayer.addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const arLayer = L.layerGroup().addTo(map);
let routePolyline = null;
let currentPosition = null;
let positionMarker = null;

const locationText = document.getElementById("locationText");
const routeStats = document.getElementById("routeStats");
const locateBtn = document.getElementById("locateBtn");

const markerForm = document.getElementById("markerForm");
const arForm = document.getElementById("arForm");
const routeForm = document.getElementById("routeForm");

const markerLatInput = document.getElementById("markerLat");
const markerLngInput = document.getElementById("markerLng");
const arLatInput = document.getElementById("arLat");
const arLngInput = document.getElementById("arLng");

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationText.textContent = "Geolocation is not available in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentPosition = [position.coords.latitude, position.coords.longitude];
      locationText.textContent = `Current location: ${currentPosition[0].toFixed(6)}, ${currentPosition[1].toFixed(6)}`;
      setCurrentPositionMarker(currentPosition);
      map.setView(currentPosition, 16);
      prefillCoordinateInputs(currentPosition);
    },
    (error) => {
      locationText.textContent = `GPS error: ${error.message}`;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
});

map.on("click", (event) => {
  const { lat, lng } = event.latlng;
  markerLatInput.value = lat.toFixed(7);
  markerLngInput.value = lng.toFixed(7);
  arLatInput.value = lat.toFixed(7);
  arLngInput.value = lng.toFixed(7);
});

markerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    name: document.getElementById("markerName").value,
    markerType: document.getElementById("markerType").value,
    latitude: Number(markerLatInput.value),
    longitude: Number(markerLngInput.value)
  };

  const response = await fetch("/api/markers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    alert(payload.error || "Failed to create marker");
    return;
  }

  markerForm.reset();
  await loadMarkers();
});

arForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    title: document.getElementById("arTitle").value,
    objectType: document.getElementById("arType").value,
    latitude: Number(arLatInput.value),
    longitude: Number(arLngInput.value)
  };

  const response = await fetch("/api/ar-objects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    alert(payload.error || "Failed to create AR object");
    return;
  }

  arForm.reset();
  await loadArObjects();
});

routeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentPosition) {
    alert("Please set your current location first.");
    return;
  }

  const destination = document.getElementById("routeDestination").value.trim();
  if (!destination) {
    alert("Please enter a destination.");
    return;
  }

  const geocodeRes = await fetch(`/api/geocode?query=${encodeURIComponent(destination)}`);
  const geocodePayload = await geocodeRes.json();
  if (!geocodeRes.ok || !geocodePayload.items || geocodePayload.items.length === 0) {
    alert(geocodePayload.error || "No geocode result found.");
    return;
  }

  const target = geocodePayload.items[0];
  await drawRoute(currentPosition[0], currentPosition[1], target.latitude, target.longitude, target.name);
});

async function drawRoute(startLat, startLng, endLat, endLng, destinationName) {
  const routeRes = await fetch(
    `/api/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`
  );
  const routePayload = await routeRes.json();

  if (!routeRes.ok) {
    alert(routePayload.error || "Failed to calculate route.");
    return;
  }

  if (routePolyline) {
    map.removeLayer(routePolyline);
  }

  const latLngs = routePayload.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  routePolyline = L.polyline(latLngs, { color: "#ef4444", weight: 5 }).addTo(map);
  map.fitBounds(routePolyline.getBounds(), { padding: [25, 25] });

  const km = (routePayload.distanceMeters / 1000).toFixed(2);
  const min = (routePayload.durationSeconds / 60).toFixed(1);
  routeStats.textContent = `Route to ${destinationName}: ${km} km, ${min} min`;
}

function setCurrentPositionMarker(position) {
  if (positionMarker) {
    positionMarker.setLatLng(position);
    return;
  }

  positionMarker = L.circleMarker(position, {
    radius: 8,
    color: "#0ea5e9",
    fillColor: "#38bdf8",
    fillOpacity: 0.85
  })
    .addTo(map)
    .bindPopup("Your current position");
}

function prefillCoordinateInputs([lat, lng]) {
  markerLatInput.value = lat.toFixed(7);
  markerLngInput.value = lng.toFixed(7);
  arLatInput.value = lat.toFixed(7);
  arLngInput.value = lng.toFixed(7);
}

async function loadMarkers() {
  markerLayer.clearLayers();
  const res = await fetch("/api/markers");
  const payload = await res.json();
  if (!res.ok) {
    alert(payload.error || "Failed to load markers");
    return;
  }

  for (const marker of payload.items) {
    const popup = `<strong>${escapeHtml(marker.name)}</strong><br/>Type: ${escapeHtml(marker.markerType)}`;
    L.marker([marker.latitude, marker.longitude]).bindPopup(popup).addTo(markerLayer);
  }
}

async function loadArObjects() {
  arLayer.clearLayers();
  const res = await fetch("/api/ar-objects");
  const payload = await res.json();
  if (!res.ok) {
    alert(payload.error || "Failed to load AR objects");
    return;
  }

  for (const object of payload.items) {
    const marker = L.circleMarker([object.latitude, object.longitude], {
      radius: 7,
      color: "#9333ea",
      fillColor: "#c084fc",
      fillOpacity: 0.7
    })
      .bindPopup(`<strong>AR:</strong> ${escapeHtml(object.title)}<br/>Type: ${escapeHtml(object.objectType)}`)
      .addTo(arLayer);

    marker.on("click", () => {
      renderArPreview(object.objectType);
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderArPreview(objectType) {
  const canvas = document.getElementById("arCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020617);
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 2.5;

  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(2, 2, 2);
  scene.add(light);

  let mesh;
  if (objectType === "sphere") {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa })
    );
  } else if (objectType === "cone") {
    mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
  } else {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xa78bfa })
    );
  }
  scene.add(mesh);

  let frame = 0;
  function animate() {
    frame += 1;
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;
    renderer.render(scene, camera);
    if (frame < 600) {
      requestAnimationFrame(animate);
    }
  }
  animate();
}

async function bootstrap() {
  await loadMarkers();
  await loadArObjects();
}

bootstrap().catch((error) => {
  console.error(error);
  alert("Failed to bootstrap app.");
});
