FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package manifests and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend application code & pre-built client assets
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

EXPOSE 8080

CMD ["node", "index.js"]
