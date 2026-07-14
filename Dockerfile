FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY electron/ ./electron/
COPY shared/ ./shared/
COPY server/ ./server/
COPY tsconfig.server.json ./

# Install tsx for running TS directly
RUN npm install -g tsx

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/app/data/abyss.db
# GEMINI_API_KEY must be set via fly secrets

CMD ["npx", "tsx", "server/index.ts"]
