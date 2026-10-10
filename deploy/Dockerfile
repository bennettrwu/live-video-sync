# Builds every workspace once, then produces two runtime images from it:
#   --target sync-server   node, runs apps/sync-server
#   --target frontend      nginx, serves apps/frontend/dist and proxies /api
FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY e2e/package.json ./e2e/package.json
RUN npm ci
RUN npm run build --workspace packages/sync-protocol \
 && npm run build --workspace packages/fastify-platform \
 && npm run build --workspace packages/sync-engine \
 && npm run build --workspace apps/sync-server \
 && npm run build --workspace apps/frontend

FROM node:24-alpine AS sync-server
WORKDIR /repo
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 ROOMS_DIR=/data/rooms MEDIA_DIR=/data/media
COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/sync-server ./apps/sync-server
EXPOSE 8080
CMD ["node", "apps/sync-server/dist/src/index.js"]

FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
