FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma (required for Prisma binaries)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# tsc does not emit JSON — copy runtime JSON assets next to compiled JS
RUN mkdir -p dist/contracts dist/config \
  && cp -R src/contracts/. dist/contracts/ \
  && if [ -d src/config ]; then cp -R src/config/. dist/config/; fi \
  && test -f dist/contracts/abi.json

# Verify build output exists
RUN ls -la dist/ && test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && exit 1)

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schema and generated client
COPY prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built files + JSON assets + treasury deployments
COPY --from=builder /app/dist ./dist
COPY contracts ./contracts
COPY start.sh ./start.sh

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "./start.sh"]

