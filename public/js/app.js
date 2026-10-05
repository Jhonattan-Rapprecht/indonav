const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const map = L.map("map").setView([51.44083, 5.47778], 13);
const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);
tiles.on("tileerror", () => {
  $("tileStatus").textContent = "Some map tiles could not load. Check your connection and browser referrer settings.";
  $("tileStatus").hidden = false;
});
tiles.on("loading", () => { $("tileStatus").hidden = true; });

const markerLayer = L.layerGroup().addTo(map);
const arLayer = L.layerGroup().addTo(map);
let markers = [];
let objects = [];
let collectionFilter = "all";
let currentPosition = null;
let selectedPoint = null;
let selectedPointMarker = null;
let positionMarker = null;
let routePolyline = null;
let destinationMarker = null;
let preview = null;
let previewVersion = 0;

function notify(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast${error ? " toast-error" : ""}`;
  toast.setAttribute("role", error ? "alert" : "status");
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.innerHTML = '<svg class="icon"><use href="#i-close"/></svg>';
  close.addEventListener("click", () => toast.remove());
  toast.append(text, close);
  $("toastRegion").append(toast);
  if (!error) setTimeout(() => toast.remove(), 6000);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

async function runAction(button, action) {
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    await action();
  } catch (error) {
    console.error(error);
    notify(error.message || "Something went wrong. Please try again.", true);
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function moveMap(position, zoom = 16) {
  map.flyTo(position, zoom, { animate: !reducedMotion.matches, duration: .7 });
}

function fillCoordinates([lat, lng]) {
  for (const prefix of ["marker", "ar"]) {
    $(`${prefix}Lat`).value = lat.toFixed(7);
    $(`${prefix}Lng`).value = lng.toFixed(7);
  }
}

map.on("click", ({ latlng }) => {
  selectedPoint = [latlng.lat, latlng.lng];
  fillCoordinates(selectedPoint);
  $("placementText").textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
  if (selectedPointMarker) selectedPointMarker.setLatLng(selectedPoint);
  else selectedPointMarker = L.circleMarker(selectedPoint, {
    radius: 6, color: "#234c3b", weight: 2, fillColor: "#fff", fillOpacity: 1
  }).addTo(map);
});

$("locateBtn").addEventListener("click", () => runAction($("locateBtn"), async () => {
  if (!navigator.geolocation) throw new Error("Your browser does not support geolocation.");
  $("locationText").textContent = "Finding your position...";
  try {
    const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    ));
    currentPosition = [position.coords.latitude, position.coords.longitude];
    $("locationText").textContent = `${currentPosition[0].toFixed(5)}, ${currentPosition[1].toFixed(5)}`;
    $("positionValue").textContent = "Located";
    $("accuracyValue").textContent = `GPS accuracy: ${Math.round(position.coords.accuracy)} m`;
    $("mapCenterLabel").textContent = "Your current location";
    if (positionMarker) positionMarker.setLatLng(currentPosition);
    else positionMarker = L.circleMarker(currentPosition, {
      radius: 8, color: "#fff", weight: 3, fillColor: "#258bc1", fillOpacity: 1
    }).addTo(map).bindPopup("Your current position");
    moveMap(currentPosition);
    fillCoordinates(currentPosition);
    notify("Location found. You're ready to plan a route.");
  } catch (error) {
    $("locationText").textContent = currentPosition
      ? `${currentPosition[0].toFixed(5)}, ${currentPosition[1].toFixed(5)}`
      : "Location unavailable. Try My location again.";
    throw new Error(`Location unavailable: ${error.message}. Check your browser's location permission.`);
  }
}));

function openCreate(kind) {
  const isObject = kind === "object";
  $("dialogTitle").textContent = isObject ? "Create AR object" : "Create marker";
  $("markerForm").hidden = isObject;
  $("arForm").hidden = !isObject;
  if (selectedPoint || currentPosition) fillCoordinates(selectedPoint || currentPosition);
  $("createDialog").showModal();
}
$("newMarkerBtn").addEventListener("click", () => openCreate("marker"));
$("newObjectBtn").addEventListener("click", () => openCreate("object"));
$("closeDialogBtn").addEventListener("click", () => $("createDialog").close());
$("createDialog").addEventListener("click", (event) => {
  if (event.target !== $("createDialog")) return;
  const rect = $("createDialog").getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    $("createDialog").close();
  }
});

for (const kind of ["marker", "ar"]) {
  const form = $(`${kind}Form`);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runAction(form.querySelector('[type="submit"]'), async () => {
      const body = {
        latitude: Number($(`${kind}Lat`).value),
        longitude: Number($(`${kind}Lng`).value)
      };
      if (kind === "marker") {
        body.name = $("markerName").value;
        body.markerType = $("markerType").value;
      } else {
        body.title = $("arTitle").value;
        body.objectType = $("arType").value;
      }
      await request(kind === "marker" ? "/api/markers" : "/api/ar-objects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      form.reset();
      $("createDialog").close();
      notify(kind === "marker" ? "Marker saved to your map." : "AR object saved to your collection.");
      await loadCollection(kind);
    });
  });
}

$("routeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runAction($("routeForm").querySelector('[type="submit"]'), async () => {
    if (!currentPosition) throw new Error("Click My location and allow location access before building a route.");
    const destination = $("routeDestination").value.trim();
    if (!destination) throw new Error("Enter a destination to continue.");
    const geocode = await request(`/api/geocode?query=${encodeURIComponent(destination)}`);
    if (!geocode.items.length) throw new Error("No place found. Try a more specific address.");
    const target = geocode.items[0];
    const route = await request(`/api/route?startLat=${currentPosition[0]}&startLng=${currentPosition[1]}&endLat=${target.latitude}&endLng=${target.longitude}`);
    clearRoute();
    routePolyline = L.polyline(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), {
      color: "#227e63", weight: 5, opacity: .85, lineCap: "round"
    }).addTo(map);
    destinationMarker = L.marker([target.latitude, target.longitude], { icon: mapIcon("marker") })
      .bindPopup(escapeHtml(target.name)).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40], animate: !reducedMotion.matches });
    $("distanceValue").innerHTML = `${(route.distanceMeters / 1000).toFixed(2)}<small>km</small>`;
    $("durationValue").textContent = `${Math.ceil(route.durationSeconds / 60)} min driving`;
    $("routeStats").textContent = `To ${target.name}`;
    $("clearRouteBtn").hidden = false;
    notify("Route ready. Follow the green line on your map.");
  });
});

function clearRoute() {
  if (routePolyline) map.removeLayer(routePolyline);
  if (destinationMarker) map.removeLayer(destinationMarker);
  routePolyline = null;
  destinationMarker = null;
  $("distanceValue").innerHTML = "--<small>km</small>";
  $("durationValue").textContent = "No active route";
  $("routeStats").textContent = "Your next journey starts here.";
  $("clearRouteBtn").hidden = true;
}
$("clearRouteBtn").addEventListener("click", clearRoute);

function mapIcon(kind) {
  return L.divIcon({
    className: "custom-map-marker",
    html: `<span class="map-pin${kind === "object" ? " object" : ""}"><svg class="icon"><use href="#i-${kind === "object" ? "cube" : "pin"}"/></svg></span>`,
    iconSize: [30, 36], iconAnchor: [15, 33], popupAnchor: [0, -32]
  });
}

async function loadCollection(kind) {
  const payload = await request(kind === "marker" ? "/api/markers" : "/api/ar-objects");
  const layer = kind === "marker" ? markerLayer : arLayer;
  layer.clearLayers();
  const items = payload.items.map((item) => ({ ...item, kind }));
  if (kind === "marker") {
    markers = items;
    $("markerCount").textContent = markers.length;
  } else {
    objects = items;
    $("objectCount").textContent = objects.length;
    $("navObjectCount").textContent = objects.length;
  }
  for (const item of items) {
    const name = item.name || item.title;
    const type = item.markerType || item.objectType;
    const marker = L.marker([Number(item.latitude), Number(item.longitude)], {
      icon: mapIcon(kind === "ar" ? "object" : "marker")
    })
      .bindPopup(`<strong>${escapeHtml(name)}</strong><br>${escapeHtml(type)}`).addTo(layer);
    marker.on("click", () => {
      if (kind === "ar") renderArPreview(item).catch((error) => {
        console.error(error);
        notify(`3D preview unavailable: ${error.message}`, true);
      });
    });
    item.mapMarker = marker;
  }
  renderCollection();
}

function renderCollection() {
  const items = [...markers, ...objects].filter((item) =>
    collectionFilter === "all" || (collectionFilter === "object" ? item.kind === "ar" : item.kind === "marker")
  );
  $("collection").replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "A blank canvas, full of possibility. Click the map, then create your first item.";
    $("collection").append(empty);
  }
  for (const item of items) {
    const isObject = item.kind === "ar";
    const button = document.createElement("button");
    button.className = "collection-item";
    button.innerHTML = `<span class="stat-icon ${isObject ? "violet" : "mint"}"><svg class="icon"><use href="#i-${isObject ? "cube" : "pin"}"/></svg></span><span class="min-w-0"><strong>${escapeHtml(item.name || item.title)}</strong><small>${escapeHtml(isObject ? `AR object / ${item.objectType}` : item.markerType)} &middot; ${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}</small></span><svg class="icon"><use href="#i-arrow"/></svg>`;
    button.addEventListener("click", () => {
      const toggle = $(isObject ? "objectsToggle" : "markersToggle");
      toggle.checked = true;
      map.addLayer(isObject ? arLayer : markerLayer);
      moveMap([Number(item.latitude), Number(item.longitude)]);
      item.mapMarker.openPopup();
      $("mapCenterLabel").textContent = item.name || item.title;
      if (isObject) renderArPreview(item).catch((error) => {
        console.error(error);
        notify(`3D preview unavailable: ${error.message}`, true);
      });
      $("map").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    });
    $("collection").append(button);
  }
}

function setFilter(filter) {
  collectionFilter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderCollection();
}
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => setFilter(button.dataset.filter))
);

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((nav) => {
      const active = nav === button;
      nav.classList.toggle("is-active", active);
      if (active) nav.setAttribute("aria-current", "page");
      else nav.removeAttribute("aria-current");
    });
    $("breadcrumb").textContent = { explore: "Overview", routes: "Route planner", objects: "Spatial objects" }[button.dataset.view];
    const target = button.dataset.view === "objects" ? $("libraryPanel")
      : button.dataset.view === "routes" ? $("routePanel") : document.querySelector(".page-heading");
    setFilter(button.dataset.view === "objects" ? "object" : "all");
    target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    if (button.dataset.view === "routes") $("routeDestination").focus({ preventScroll: true });
  });
});

for (const [id, layer] of [["markersToggle", markerLayer], ["objectsToggle", arLayer]]) {
  $(id).addEventListener("change", () => $(id).checked ? map.addLayer(layer) : map.removeLayer(layer));
}
$("fitMapBtn").addEventListener("click", () => {
  const points = [...markers, ...objects].map((item) => [Number(item.latitude), Number(item.longitude)]);
  if (currentPosition) points.push(currentPosition);
  if (!points.length) {
    moveMap([51.44083, 5.47778], 13);
    $("mapCenterLabel").textContent = "Eindhoven, Netherlands";
    notify("No saved items yet. Showing the starting map.");
  } else {
    map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16, animate: !reducedMotion.matches });
    $("mapCenterLabel").textContent = "Your spatial collection";
  }
});
new ResizeObserver(() => map.invalidateSize()).observe($("map"));

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function renderArPreview(object) {
  const version = ++previewVersion;
  const THREE = await import("/vendor/three.module.min.js");
  if (version !== previewVersion) return;
  disposePreview();
  const canvas = $("arCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  canvas.hidden = false;
  $("previewPlaceholder").hidden = true;
  $("previewTitle").textContent = object.title;
  $("previewDescription").textContent = `${object.objectType} geometry / saved at ${Number(object.latitude).toFixed(4)}, ${Number(object.longitude).toFixed(4)}`;
  $("previewState").textContent = "Object selected";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(2.5, 1.8, 3.5);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xd9ffe3, 3);
  light.position.set(3, 4, 5);
  scene.add(light);
  const geometry = object.objectType === "sphere" ? new THREE.SphereGeometry(.65, 32, 32)
    : object.objectType === "cone" ? new THREE.ConeGeometry(.65, 1.4, 32) : new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x83d8ab, metalness: .35, roughness: .3 });
  const mesh = new THREE.Mesh(geometry, material);
  const scale = Number(object.scaleFactor);
  mesh.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  mesh.rotation.y = THREE.MathUtils.degToRad(Number(object.rotationDegrees) || 0);
  scene.add(mesh);
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  renderer.setAnimationLoop((time) => {
    if (!reducedMotion.matches) mesh.rotation.y = THREE.MathUtils.degToRad(Number(object.rotationDegrees) || 0) + time * .0003;
    renderer.render(scene, camera);
  });
  preview = { renderer, geometry, material, observer };
}
function disposePreview() {
  if (!preview) return;
  preview.renderer.setAnimationLoop(null);
  preview.observer.disconnect();
  preview.geometry.dispose();
  preview.material.dispose();
  preview.renderer.dispose();
  preview = null;
}
window.addEventListener("pagehide", () => {
  previewVersion += 1;
  disposePreview();
});

async function bootstrap() {
  const results = await Promise.allSettled([loadCollection("marker"), loadCollection("ar")]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason);
      notify(`Collection could not load: ${result.reason.message}`, true);
      $("collection").textContent = "Some items could not load. Refresh to try again.";
    }
  }
}
bootstrap();
