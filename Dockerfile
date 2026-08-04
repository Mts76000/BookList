FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Génère le client Prisma et construit l'application Next.js
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENV NODE_ENV production
ENV PORT 3000

# Applique les migrations puis démarre le serveur (Coolify injecte DATABASE_URL)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
