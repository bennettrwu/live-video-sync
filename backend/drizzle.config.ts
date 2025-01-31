import {defineConfig} from "drizzle-kit";
import {envSchema} from 'env-schema';
import {Type} from '@sinclair/typebox';

const env = envSchema({
  dotenv: true,
  schema: Type.Object({
    POSTGRES_HOST: Type.String(),
    POSTGRES_PASSWORD: Type.String(),
    POSTGRES_USER: Type.String(),
    POSTGRES_DB: Type.String(),
  })
})

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/live-video-sync-db/live-video-sync-db.schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}/${env.POSTGRES_DB}?sslmode=disable`,
  },
});
