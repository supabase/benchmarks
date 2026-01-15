terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.0.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

module "script" {
  source = "./modules/script"

  ami_id               = var.ami_id
  instances_count      = var.instances_count
  instance_type        = var.instance_type
  security_group_id    = var.security_group_id
  subnet_id            = var.subnet_id
  sut_name             = var.sut_name
  key_name             = var.key_name
  private_key_location = var.private_key_location

  testrun_name    = var.testrun_name
  testrun_id      = var.testrun_id
  test_origin     = var.test_origin
  benchmark_id    = var.benchmark_id
  supabench_token = var.supabench_token
  supabench_uri   = var.supabench_uri

  rate                 = var.rate
  duration             = var.duration
  convex_url           = var.convex_url
  scale_factor         = var.scale_factor
  conns                = var.conns
  requests             = var.requests
  ramping_duration     = var.ramping_duration
  consecutive_duration = var.consecutive_duration
  ramps_count          = var.ramps_count
}
