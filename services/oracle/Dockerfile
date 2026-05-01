FROM node:20-alpine

WORKDIR /app

RUN npm init -y && npm install express ethers dotenv

COPY index.ts .

RUN npm install -g tsx

EXPOSE 8082

CMD ["tsx", "index.ts"]
