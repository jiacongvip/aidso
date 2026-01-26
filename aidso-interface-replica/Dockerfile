ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3002

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3002"]
