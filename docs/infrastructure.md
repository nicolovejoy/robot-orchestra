# Infrastructure & Architecture

## System Architecture

The "Am I an AI?" application is built with a modern web architecture featuring a static frontend with serverless backend components:

### Frontend Architecture

- **Single Page Application (SPA)**: Built with React and TypeScript
- **Client-Side Routing**: Using React Router for navigation
- **State Management**: React hooks for local state management
- **Component Structure**: Modular components with clear separation of concerns
- **Design System**: Centralized styling with CSS variables and TypeScript interfaces

### Backend Architecture

The backend follows a serverless architecture pattern:

- **API Gateway**: Routes API requests to appropriate Lambda functions
- **Lambda Functions**: Process requests and return responses
- **DynamoDB**: NoSQL database for user data and interactions
- **S3**: Hosts static website assets
- **CloudFront**: CDN for global content delivery
- **Route53**: DNS management

## AWS Infrastructure

The project uses AWS infrastructure managed by Terraform:

### Core Components

- **S3**: Hosts the static website content

  - Configured for website hosting
  - Restricted access via CloudFront
  - Lifecycle policies for object management

- **CloudFront**: CDN for global content delivery

  - HTTPS enforcement
  - Caching strategies for optimal performance
  - Origin access identity for S3 security

- **Route53**: DNS management

  - A records pointing to CloudFront distribution
  - Health checks for high availability

- **ACM**: SSL certificate management

  - Automated renewal
  - US-East-1 region for CloudFront compatibility

- **DynamoDB**: NoSQL database
  - Users table with email-based GSI
  - Interactions table for tracking user-AI interactions
  - Pay-per-request billing mode

### Infrastructure as Code

All infrastructure is defined using Terraform for consistency and reproducibility:

```hcl
# S3 bucket for website hosting
resource "aws_s3_bucket" "website" {
  bucket = var.domain_name
  tags   = var.tags
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  # Configuration details...
}
```

### Deployment Pipeline

The deployment process is managed through setup and teardown scripts:

1. **Setup Process**:

   - Initialize Terraform
   - Apply infrastructure changes
   - Deploy frontend to S3
   - Deploy backend to Lambda
   - Verify DynamoDB tables
   - Invalidate CloudFront cache

2. **Teardown Process**:
   - Delete CloudFront distribution
   - Delete S3 bucket
   - Delete SSL certificate
   - Delete DNS records
   - Destroy Terraform infrastructure

## Security Considerations

The infrastructure includes several security measures:

- **S3 Bucket Policies**: Restricting direct access to website content
- **CloudFront OAI**: Only allowing CloudFront to access S3 content
- **HTTPS Enforcement**: All traffic is encrypted in transit
- **IAM Policies**: Least privilege principle for all service accounts
- **DynamoDB Encryption**: Data at rest encryption
- **API Gateway Authentication**: JWT-based authentication for API endpoints

## Cost Optimization

The serverless architecture provides cost optimization:

- **Pay-per-use model**: Only pay for actual usage
- **No always-on servers**: Reduces baseline costs
- **CloudFront caching**: Reduces origin requests
- **DynamoDB on-demand**: Pay only for actual reads and writes
- **S3 lifecycle policies**: Manages storage costs

## Monitoring & Logging

Infrastructure monitoring utilizes:

- **CloudWatch**: Metrics and alarms for service health
- **CloudTrail**: Audit logs for all AWS API calls
- **S3 Access Logs**: Detailed logs of website access
- **CloudFront Logs**: Detailed CDN request logs
- **DynamoDB CloudWatch metrics**: Table performance and usage metrics

## Disaster Recovery

The infrastructure includes disaster recovery measures:

- **S3 Versioning**: Enables point-in-time recovery
- **CloudFront Failover**: Regional resilience
- **DynamoDB Backups**: Point-in-time recovery capability
- **Backup Procedures**: Regular backups of configuration and content
- **Recovery Time Objective (RTO)**: Typically minutes for full restoration
- **Recovery Point Objective (RPO)**: Typically seconds to minutes of data loss in worst case
