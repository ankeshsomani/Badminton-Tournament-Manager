FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install server production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source and pre-built client assets
COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
