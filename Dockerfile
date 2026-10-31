FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules (e.g. argon2)
RUN apk add --no-cache python3 make g++ gcc libc-dev

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]

