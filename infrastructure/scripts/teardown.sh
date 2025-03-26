#!/bin/bash
set -e

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Terraform is required but not installed. Aborting." >&2; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required but not installed. Aborting." >&2; exit 1; }

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ Success"
    else
        echo "❌ Failed"
        exit 1
    fi
}

# Get resource names from Terraform output
echo "🔍 Getting resource names from Terraform..."
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
CERTIFICATE_ARN=$(terraform output -raw certificate_arn)
DOMAIN_NAME=$(terraform output -raw domain_name)

# Delete CloudFront distribution
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "🗑️  Deleting CloudFront distribution..."
    aws cloudfront delete-distribution --id $DISTRIBUTION_ID --if-match $(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'ETag' --output text)
    echo "⏳ Waiting for CloudFront distribution to be deleted..."
    aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
    check_status
fi

# Delete S3 bucket
if [ -n "$BUCKET_NAME" ]; then
    echo "🗑️  Deleting S3 bucket..."
    aws s3 rb s3://$BUCKET_NAME --force
    check_status
fi

# Delete SSL certificate
if [ -n "$CERTIFICATE_ARN" ]; then
    echo "🗑️  Deleting SSL certificate..."
    aws acm delete-certificate --certificate-arn $CERTIFICATE_ARN
    check_status
fi

# Delete DNS records
if [ -n "$DOMAIN_NAME" ]; then
    echo "🗑️  Deleting DNS records..."
    ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name $DOMAIN_NAME --query 'HostedZones[0].Id' --output text | sed 's/\/hostedzone\///')
    aws route53 delete-hosted-zone --id $ZONE_ID
    check_status
fi

# Destroy Terraform infrastructure
echo "🗑️  Destroying Terraform infrastructure..."
terraform destroy -auto-approve
check_status

echo "✅ Teardown complete!" 