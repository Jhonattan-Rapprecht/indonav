const { startServer } = require("./src/app");

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
