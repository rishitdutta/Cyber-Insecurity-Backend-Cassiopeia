# Use official Node.js 18 image
FROM node:18

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy all source code
COPY . .

# Build the app (if using TypeScript or build step)
# RUN npm run build

# Run database migrations
RUN npx prisma migrate deploy

# Expose the port your app runs on
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]