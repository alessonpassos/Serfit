import "dotenv/config";
import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const destination = resolve(
  process.argv[2] ||
    `./backups/serfit-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(
  process.env.DATABASE_PATH || "./server/data/serfit.sqlite",
  { readOnly: true },
);
try {
  await backup(db, destination);
  console.log(`Backup concluído: ${destination}`);
} finally {
  db.close();
}
