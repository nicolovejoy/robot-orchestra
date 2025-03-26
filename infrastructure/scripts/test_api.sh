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

echo "🔍 Testing API Gateway endpoints..."

# Get the API URL from terraform output
echo "📋 Getting API URL from Terraform..."
API_URL=$(terraform output -raw api_gateway_url)

echo "Found API URL: $API_URL"

# Test health check endpoint
echo "🧪 Testing health check endpoint..."
curl -s -X GET "$API_URL/health" | jq .
check_status

# Test chat completion endpoint
echo "🧪 Testing chat completion endpoint..."
curl -s -X POST "$API_URL/api/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }' | jq .
check_status

echo "✨ All API tests completed successfully!" 