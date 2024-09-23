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

# Create an infrastructure with System Under Test (SUT).
# module "setup_infra" {
#   source = "./modules/setup"

#   app_name = var.app_name
#   fly_access_token = var.fly_access_token
# }

module "script" {
  source = "./modules/script"

  ami_id               = var.ami_id
  instance_type        = var.instance_type
  instances_count      = var.instances_count
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

  anon_token          = var.anon_token
  service_token       = var.service_token
  base_uri            = var.base_uri
  conns               = var.conns
  requests            = var.requests
  rampscount          = var.rampscount
  rampingduration     = var.rampingduration
  consecutiveduration = var.consecutiveduration

  # depends_on = [
  #   module.setup_infra.ready,
  # ]
}