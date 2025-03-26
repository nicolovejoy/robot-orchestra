output "website_url" {
  description = "URL of the website"
  value       = "https://amianai.com"
}

output "domain_name" {
  description = "The domain name for the website"
  value       = "amianai.com"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket hosting the website"
  value       = aws_s3_bucket.website.id
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = aws_acm_certificate.website.arn
}

output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = aws_api_gateway_deployment.api.invoke_url
}

output "users_table_name" {
  description = "Name of the Users DynamoDB table"
  value       = aws_dynamodb_table.users_table.name
}

output "interactions_table_name" {
  description = "Name of the Interactions DynamoDB table"
  value       = aws_dynamodb_table.interactions_table.name
}

output "cloudfront_url" {
  description = "URL of the CloudFront distribution"
  value       = aws_cloudfront_distribution.website.domain_name
} 