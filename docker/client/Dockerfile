FROM node:20-slim

WORKDIR /app

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies in both root and client directories
RUN npm install && \
    cd client && npm install

COPY . .

WORKDIR /app/client

# Add node_modules/.bin to PATH
ENV PATH /app/client/node_modules/.bin:$PATH

EXPOSE 5173

CMD ["npm", "run", "dev"] 