FROM node:20-alpine

WORKDIR /app

# Backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci

# Frontend dependencies
COPY package*.json ./
RUN npm ci

# Copy all source
COPY . .

# Build frontend
RUN npm run build

# Start backend (que sirve el frontend desde dist/)
WORKDIR /app/server
EXPOSE 3000
ENV NODE_OPTIONS="--max-old-space-size=1536"
CMD ["npx", "tsx", "src/index.ts"]
