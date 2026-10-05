const express = require("express");
const { getDb } = require("../db/database");
const { parseLatitude, parseLongitude, requireNonEmptyText } = require("../utils/validation");

const router = express.Router();

router.get("/markers", async (req, res, next) => {
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT id, name, latitude, longitude, marker_type AS markerType, metadata_json AS metadata, created_at AS createdAt, updated_at AS updatedAt FROM markers ORDER BY id DESC"
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/markers", async (req, res, next) => {
  try {
    const name = requireNonEmptyText(req.body.name, "name");
    const latitude = parseLatitude(req.body.latitude);
    const longitude = parseLongitude(req.body.longitude);
    const markerType = typeof req.body.markerType === "string" && req.body.markerType.trim()
      ? req.body.markerType.trim()
      : "poi";
    const metadata = req.body.metadata ?? null;

    const db = getDb();
    const [result] = await db.query(
      "INSERT INTO markers (name, latitude, longitude, marker_type, metadata_json) VALUES (?, ?, ?, ?, ?)",
      [name, latitude, longitude, markerType, metadata ? JSON.stringify(metadata) : null]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.get("/ar-objects", async (req, res, next) => {
  try {
    const db = getDb();
    const [rows] = await db.query(
      "SELECT id, title, object_type AS objectType, latitude, longitude, altitude, scale_factor AS scaleFactor, rotation_degrees AS rotationDegrees, metadata_json AS metadata, created_at AS createdAt, updated_at AS updatedAt FROM ar_objects ORDER BY id DESC"
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/ar-objects", async (req, res, next) => {
  try {
    const title = requireNonEmptyText(req.body.title, "title");
    const objectType = typeof req.body.objectType === "string" && req.body.objectType.trim()
      ? req.body.objectType.trim()
      : "cube";
    const latitude = parseLatitude(req.body.latitude);
    const longitude = parseLongitude(req.body.longitude);
    const altitude = Number(req.body.altitude ?? 0);
    const scaleFactor = Number(req.body.scaleFactor ?? 1);
    const rotationDegrees = Number(req.body.rotationDegrees ?? 0);

    if (!Number.isFinite(altitude) || !Number.isFinite(scaleFactor) || !Number.isFinite(rotationDegrees)) {
      const err = new Error("altitude, scaleFactor, and rotationDegrees must be numeric values");
      err.statusCode = 400;
      throw err;
    }

    const metadata = req.body.metadata ?? null;
    const db = getDb();
    const [result] = await db.query(
      "INSERT INTO ar_objects (title, object_type, latitude, longitude, altitude, scale_factor, rotation_degrees, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        title,
        objectType,
        latitude,
        longitude,
        altitude,
        scaleFactor,
        rotationDegrees,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.get("/route", async (req, res, next) => {
  try {
    const startLat = parseLatitude(req.query.startLat, "startLat");
    const startLng = parseLongitude(req.query.startLng, "startLng");
    const endLat = parseLatitude(req.query.endLat, "endLat");
    const endLng = parseLongitude(req.query.endLng, "endLng");

    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const routeResponse = await fetch(routeUrl);
    if (!routeResponse.ok) {
      const err = new Error(`Routing provider failed with status ${routeResponse.status}`);
      err.statusCode = 502;
      throw err;
    }

    const routeData = await routeResponse.json();
    const route = routeData?.routes?.[0];
    if (!route) {
      const err = new Error("No route found for the provided coordinates");
      err.statusCode = 404;
      throw err;
    }

    res.json({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry
    });
  } catch (error) {
    next(error);
  }
});

router.get("/geocode", async (req, res, next) => {
  try {
    const query = requireNonEmptyText(req.query.query, "query");
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "indonav/1.0 (educational project)"
      }
    });

    if (!geocodeResponse.ok) {
      const err = new Error(`Geocoding provider failed with status ${geocodeResponse.status}`);
      err.statusCode = 502;
      throw err;
    }

    const payload = await geocodeResponse.json();
    const items = payload.map((item) => ({
      name: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    }));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
