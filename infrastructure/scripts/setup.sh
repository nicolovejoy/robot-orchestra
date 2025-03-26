#!/bin/bash
set -e

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Terraform is required but not installed. Aborting." >&2; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
        exit 1
    fi
}

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init
check_status

# Apply infrastructure
echo "🏗️  Applying infrastructure..."
terraform apply -auto-approve
check_status

# Get resource names from Terraform output
echo "🔍 Getting resource names from Terraform..."
DOMAIN_NAME=$(terraform output -raw domain_name)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
API_URL=$(terraform output -raw api_gateway_url)

# Wait for certificate validation
echo "⏳ Waiting for certificate validation..."
sleep 30

# Deploy frontend content
echo "🚀 Deploying frontend content..."
cd ../frontend
npm install
npm run build
aws s3 sync out/ s3://$BUCKET_NAME --delete --cache-control "max-age=86400"
check_status

# Deploy backend API
echo "🚀 Deploying backend API..."
cd ../backend
npm install
npm run build
cd ../infrastructure
zip -r backend_lambda.zip ../backend/dist/* ../backend/node_modules/*
aws lambda update-function-code --function-name prod-api --zip-file fileb://backend_lambda.zip
check_status

# Verify DynamoDB tables
echo "🔍 Verifying DynamoDB tables..."
USERS_TABLE=$(terraform output -raw users_table_name)
INTERACTIONS_TABLE=$(terraform output -raw interactions_table_name)

aws dynamodb describe-table --table-name $USERS_TABLE > /dev/null
check_status
aws dynamodb describe-table --table-name $INTERACTIONS_TABLE > /dev/null
check_status

# Invalidate CloudFront cache
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    echo "⏳ Waiting for cache invalidation to complete..."
    aws cloudfront wait invalidation-completed --distribution-id $DISTRIBUTION_ID --id $(aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID --query 'InvalidationList.Items[0].Id' --output text)
    check_status
fi

echo "✅ Setup complete!"
echo "🌐 Website URL: https://$DOMAIN_NAME"
echo "�� API URL: $API_URL" 