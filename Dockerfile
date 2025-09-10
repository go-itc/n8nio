FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app

# Wenn du KEINE package-lock.json hast:
COPY package.json .
RUN npm install --omit=dev

# Falls du später eine lockfile hast, kannst du beide kopieren und "ci" nutzen:
# COPY package.json package-lock.json ./
# RUN npm ci --omit=dev

COPY . .
ENV PORT=3000
CMD ["node", "server.js"]
