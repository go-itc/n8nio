# Dockerfile
FROM n8nio/n8n:alpine

USER root
RUN apk add --no-cache ffmpeg
USER node

# n8n lauscht standardmäßig auf 5678 – Railway liefert $PORT.
# Wir mappen das auf N8N_PORT via Env (siehe Railway Vars unten).
