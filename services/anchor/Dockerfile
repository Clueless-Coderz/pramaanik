FROM node:20-alpine

WORKDIR /app

RUN npm init -y && npm install ethers dotenv

COPY index.ts .

# Use tsx for TypeScript execution
RUN npm install -g tsx

EXPOSE 8083

CMD ["tsx", "index.ts"]
