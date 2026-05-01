FROM node:20-alpine

WORKDIR /app

RUN npm init -y && npm install express multer dotenv

COPY index.ts .

RUN npm install -g tsx

EXPOSE 5001

CMD ["tsx", "index.ts"]
