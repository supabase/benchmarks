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

  rate                = var.rate
  conns               = var.conns
  rooms               = var.rooms
  duration            = var.duration
  messages_per_second = var.messages_per_second
  message_size_kb     = var.message_size_kb
  pg_pass             = var.pg_pass
  pg_host             = var.pg_host
  mp_token            = var.mp_token
  mp_uri              = var.mp_uri
  auth_uri            = var.auth_uri
  presence_enabled    = var.presence_enabled
}
