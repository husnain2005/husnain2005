# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for sharp (image processing)
RUN apk add --no-cache python3 make g++ vips-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/attachments uploads/thumbnails uploads/pdfs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "src/index.js"]
