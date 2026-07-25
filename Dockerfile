# Stage 1: Build React Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy root package manifests and install server dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY index.js ./
COPY config/ ./config/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY services/ ./services/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/
COPY MBPLSeason1.0.xlsx* ./
COPY client/ ./client/

# Copy compiled React build assets from Stage 1
COPY --from=client-builder /app/client/build ./client/build

EXPOSE 8080

CMD ["node", "index.js"]
