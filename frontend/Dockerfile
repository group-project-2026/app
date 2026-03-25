FROM node:22.22.2-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .