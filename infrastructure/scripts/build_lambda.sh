#!/bin/bash

# Exit on error
set -e

# Set AWS region
export AWS_DEFAULT_REGION=us-east-1

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
        exit 1
    fi
}

echo "🔨 Building Lambda function..."

# Create a temporary directory
echo "📁 Creating temporary build directory..."
BUILD_DIR="lambda_build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR
check_status

# Copy the backend files
echo "📋 Copying backend files..."
cp -r ../backend/src $BUILD_DIR/
cp ../backend/package.json $BUILD_DIR/
cp ../backend/tsconfig.json $BUILD_DIR/
check_status

# Install dependencies
echo "📦 Installing dependencies..."
cd $BUILD_DIR

# Install production dependencies
npm install --production
check_status

# Install dev dependencies for TypeScript
echo "📦 Installing TypeScript dependencies..."
npm install --save-dev typescript @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken
check_status

# Build TypeScript
echo "🔧 Building TypeScript..."
npm run build
check_status

# Remove dev dependencies
echo "🧹 Removing dev dependencies..."
rm -rf node_modules
npm install --production
check_status

# Create the zip file
echo "📦 Creating Lambda package..."
zip -r ../backend_lambda.zip dist/ node_modules/
check_status

# Clean up
echo "🧹 Cleaning up..."
cd ..
rm -rf $BUILD_DIR
check_status

# Verify the zip file
echo "🔍 Verifying Lambda package..."
if [ ! -f backend_lambda.zip ]; then
    echo "❌ Lambda package not created!"
    exit 1
fi

# Get the file size
FILE_SIZE=$(ls -lh backend_lambda.zip | awk '{print $5}')
echo "✨ Lambda package created: backend_lambda.zip ($FILE_SIZE)"

# Update Lambda function
echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
  --function-name prod-api \
  --zip-file fileb://backend_lambda.zip
check_status

echo "✨ Build and deployment completed successfully!" 