terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.0.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

# Create an infrastructure with System Under Test (SUT).
module "setup_infra" {
  source = "./modules/setup"

  # specify variables required to provide SUT
  some_sut_related_var = var.some_sut_related_var
  provider_access_token = var.provider_access_token
}

# Run the ec2 instance to create load. And run load scripts.
module "script" {
  source = "./modules/script"

  # variables to create ec2 instance to create load
  ami_id               = var.ami_id
  instance_type        = var.instance_type
  security_group_id    = var.security_group_id
  subnet_id            = var.subnet_id
  sut_name             = var.sut_name
  key_name             = var.key_name
  private_key_location = var.private_key_location

  # these will be passed to the script by supabench
  testrun_name    = var.testrun_name
  testrun_id      = var.testrun_id
  test_origin     = var.test_origin
  benchmark_id    = var.benchmark_id
  supabench_token = var.supabench_token
  supabench_uri   = var.supabench_uri

  # variables to pass to load script
  duration  = var.duration
  some_var  = var.some_var
  sut_url   = var.mp_url
  sut_token = var.sut_token

  depends_on = [
    module.setup_infra.ready,
  ]
}