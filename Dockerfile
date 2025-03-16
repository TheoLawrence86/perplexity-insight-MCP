FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript code
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Expose port (if needed for HTTP connections)
# EXPOSE 3000

# Run the server
CMD ["node", "dist/index.js"]
