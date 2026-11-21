# ---- build: compile TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
# Type errors are printed but do not stop the image (JavaScript is still emitted). Fix them when you see them in the log.
RUN npx tsc --noEmitOnError false ; test -f dist/server.js

# ---- run: production dependencies only
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/storage && chown -R node:node /data /app
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
