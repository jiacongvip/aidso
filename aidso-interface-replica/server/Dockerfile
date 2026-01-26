ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE}

# 安装 OpenSSL 和必要的依赖（Prisma 需要）
RUN apk add --no-cache openssl libc6-compat

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
