# Use an official Node 18 image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project into the container
COPY . .

# Build the project
RUN npm run build

# Expose port 3000 to make the app accessible
EXPOSE 3000

# Run the app in production mode
CMD ["npm", "start"]

