import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Append sslmode=require without URL-parsing the string (to avoid corrupting
// special characters in the password).
const rawUrl = process.env.DATABASE_URL;
const dbUrl = rawUrl.includes("sslmode=")
  ? rawUrl
  : rawUrl.includes("?")
    ? `${rawUrl}&sslmode=require`
    : `${rawUrl}?sslmode=require`;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
