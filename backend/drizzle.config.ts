import {CONFIG} from './src/config/config';
import {defineConfig} from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/live-video-sync-db/live-video-sync-db.schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: CONFIG.db.url
  },
});
