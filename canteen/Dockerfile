FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

COPY . .

EXPOSE 5000 5001

CMD ["node", "index.js"]
