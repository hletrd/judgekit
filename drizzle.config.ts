import { defineConfig } from "drizzle-kit";

const dialect = (process.env.DB_DIALECT ?? "sqlite") as "sqlite" | "postgresql" | "mysql";

function getConfig() {
  switch (dialect) {
    case "postgresql":
      return defineConfig({
        schema: "./src/lib/db/schema.pg.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      });
    case "mysql":
      return defineConfig({
        schema: "./src/lib/db/schema.mysql.ts",
        out: "./drizzle/mysql",
        dialect: "mysql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      });
    default:
      return defineConfig({
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.DATABASE_PATH ?? "./data/judge.db",
        },
      });
  }
}

export default getConfig();
