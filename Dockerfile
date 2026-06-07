FROM node:18-alpine

# Install curl and unzip for OTA update script
RUN apk add --no-cache curl unzip

WORKDIR /app

# 1. Install dependencies
COPY package.json ./
RUN npm install

# 2. Copy the rest of your code
COPY . .

# 3. Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4. Expose and Bind to all incoming network traffic
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
