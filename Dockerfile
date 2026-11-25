FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server/start.mjs"]
