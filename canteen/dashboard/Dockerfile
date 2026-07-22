FROM node:18-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
RUN node -e "const fs=require('fs');const p='node_modules/web3/package.json';const pkg=JSON.parse(fs.readFileSync(p));pkg.main='src/index.js';fs.writeFileSync(p,JSON.stringify(pkg))"
COPY public/ public/
COPY src/ src/
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/build/ ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
