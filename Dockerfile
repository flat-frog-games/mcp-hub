FROM node:20-alpine

# Provide npx/node access in the image
RUN apk add --no-cache bash curl git

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.js .

ENV PORT=8083
EXPOSE 8083

CMD ["npm", "start"]
