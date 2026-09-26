import { defineConfig } from "drizzle-kit";

// Database credentials stay commented out until the website is ready to launch.
// const connectionString = process.env.DATABASE_URL;
// if (!connectionString) {
//   throw new Error("DATABASE_URL is required to run drizzle commands");
// }

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  // dbCredentials: {
  //   url: connectionString,
  // },
});
