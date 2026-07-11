FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node src ./src
RUN chown node:node /app

EXPOSE 4001
USER node
CMD ["node", "--experimental-strip-types", "src/index.ts"]
