terraform {
  backend "s3" {
    bucket = "amianai-terraform-state-218141621131"
    key    = "terraform.tfstate"
    region = "us-west-2"
    encrypt = true
  }
}
