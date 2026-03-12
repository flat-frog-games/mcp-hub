terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket  = "flatfrog.games"
    key     = "arundel.cloud/live/prod/aws_ecs_services/mcp/terraform.tfstate"
    region  = "eu-west-2"
  }
}

provider "aws" {
  region  = "eu-west-2"
}
