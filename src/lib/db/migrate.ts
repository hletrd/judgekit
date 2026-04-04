import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

console.log("Running PostgreSQL migrations...");
await migrate(db as any, { migrationsFolder: "./drizzle/pg" });
console.log("Migrations complete.");
