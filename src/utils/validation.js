function parseLatitude(value, label = "latitude") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -90 || parsed > 90) {
    const err = new Error(`${label} must be a number between -90 and 90`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

function parseLongitude(value, label = "longitude") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -180 || parsed > 180) {
    const err = new Error(`${label} must be a number between -180 and 180`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

function requireNonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    const err = new Error(`${label} is required`);
    err.statusCode = 400;
    throw err;
  }
  return value.trim();
}

module.exports = {
  parseLatitude,
  parseLongitude,
  requireNonEmptyText
};
