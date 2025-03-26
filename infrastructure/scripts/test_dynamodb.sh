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

echo "🧪 Testing DynamoDB tables..."

# Get table names from Terraform output
USERS_TABLE=$(terraform output -raw users_table_name)
INTERACTIONS_TABLE=$(terraform output -raw interactions_table_name)

echo "- Users: $USERS_TABLE"
echo "- Interactions: $INTERACTIONS_TABLE"

# Test Users table
echo "🧪 Testing Users table..."
aws dynamodb put-item \
  --table-name $USERS_TABLE \
  --item '{
    "pk": {"S": "USER#test-user"},
    "sk": {"S": "PROFILE#test-user"},
    "id": {"S": "test-user"},
    "email": {"S": "test@example.com"},
    "name": {"S": "Test User"},
    "createdAt": {"N": "1234567890"},
    "updatedAt": {"N": "1234567890"}
  }'

aws dynamodb get-item \
  --table-name $USERS_TABLE \
  --key '{
    "pk": {"S": "USER#test-user"},
    "sk": {"S": "PROFILE#test-user"}
  }'

aws dynamodb delete-item \
  --table-name $USERS_TABLE \
  --key '{
    "pk": {"S": "USER#test-user"},
    "sk": {"S": "PROFILE#test-user"}
  }'

# Test Interactions table
echo "🧪 Testing Interactions table..."
aws dynamodb put-item \
  --table-name $INTERACTIONS_TABLE \
  --item '{
    "pk": {"S": "INTERACTION#test-interaction"},
    "sk": {"S": "MESSAGE#test-message"},
    "id": {"S": "test-interaction"},
    "userId": {"S": "test-user"},
    "agentId": {"S": "test-agent"},
    "createdAt": {"N": "1234567890"},
    "lastMessageTimestamp": {"N": "1234567890"}
  }'

aws dynamodb get-item \
  --table-name $INTERACTIONS_TABLE \
  --key '{
    "pk": {"S": "INTERACTION#test-interaction"},
    "sk": {"S": "MESSAGE#test-message"}
  }'

aws dynamodb delete-item \
  --table-name $INTERACTIONS_TABLE \
  --key '{
    "pk": {"S": "INTERACTION#test-interaction"},
    "sk": {"S": "MESSAGE#test-message"}
  }'

echo "✅ All DynamoDB tests passed!" 