FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build || true

# Cloud Run expects the container to listen on the port provided in the PORT env var (usually 8080)
EXPOSE 8080

# Use the project production entrypoint. `server-production.js` listens on process.env.PORT.
CMD ["node", "server-production.js"]