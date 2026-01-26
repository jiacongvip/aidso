ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY config.json permissions.json ./

EXPOSE 3005

CMD ["npm", "run", "dev"]
