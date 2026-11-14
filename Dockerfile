FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY problem_c_data ./problem_c_data
COPY backend ./backend
COPY --from=web /web/dist ./frontend/dist
WORKDIR /app/backend
RUN npm install --omit=dev
ENV PORT=7860
EXPOSE 7860
CMD ["node", "server.js"]