FROM node:22-slim
WORKDIR /app
COPY problem_c_data ./problem_c_data
COPY backend ./backend
WORKDIR /app/backend
RUN npm install --omit=dev
ENV PORT=8000
EXPOSE 8000
CMD ["node", "server.js"]