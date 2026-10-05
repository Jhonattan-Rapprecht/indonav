const fs = require("node:fs");
const path = require("node:path");

const destination = path.join(__dirname, "..", "public", "vendor");
fs.mkdirSync(destination, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, "..", "node_modules", "three", "build", "three.module.min.js"),
  path.join(destination, "three.module.min.js")
);
