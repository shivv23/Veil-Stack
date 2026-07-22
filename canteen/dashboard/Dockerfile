FROM node:18-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
RUN cp node_modules/web3/dist/web3.js node_modules/web3/dist/web3.min.js
COPY public/ public/
COPY src/ src/
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/build/ ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
