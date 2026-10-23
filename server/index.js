import "dotenv/config";
import { createApp } from "./app.js";
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const { app, db } = createApp();
const server = app.listen(port, host, () =>
  console.log(`SerFit API disponível em http://${host}:${port}`),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
