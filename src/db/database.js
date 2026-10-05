const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "indonav",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function createDatabaseIfMissing() {
  const adminPool = mysql.createPool({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0
  });

  try {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
  } finally {
    await adminPool.end();
  }
}

async function initializeSchema() {
  const createMarkersTable = `
    CREATE TABLE IF NOT EXISTS markers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      marker_type VARCHAR(60) NOT NULL DEFAULT 'poi',
      metadata_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createArObjectsTable = `
    CREATE TABLE IF NOT EXISTS ar_objects (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(120) NOT NULL,
      object_type VARCHAR(60) NOT NULL DEFAULT 'cube',
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      altitude FLOAT NOT NULL DEFAULT 0,
      scale_factor FLOAT NOT NULL DEFAULT 1,
      rotation_degrees FLOAT NOT NULL DEFAULT 0,
      metadata_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(createMarkersTable);
  await pool.query(createArObjectsTable);
}

async function initializeDatabase() {
  await createDatabaseIfMissing();
  pool = mysql.createPool(DB_CONFIG);
  await initializeSchema();
}

function getDb() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initializeDatabase() first.");
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getDb
};
