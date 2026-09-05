import { pool } from "./db";
import { seedDevelopmentData } from "./seed";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed cannot run with NODE_ENV=production");
}

seedDevelopmentData()
  .then(() => pool.end())
  .catch(async error => {
    console.error("Development seed failed:", error instanceof Error ? error.message : "Unknown error");
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
