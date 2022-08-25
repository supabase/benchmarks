# This block is related to your benchmark.
# Variables to pass to the benchmark script.
# Variables required to run the SUT infrastructure.

# Specify some variables that are required for your benchmark.

variable "duration" {
  description = "Duration of the test"
  type        = string
  default     = "60"
}

variable "some_var" {
  description = "Some var for your benchmark"
  type        = string
}

variable "sut_url" {
  description = "Example var - link to SUT"
  type        = string
  default     = "https://example.com/path"
}

variable "sut_token" {
  description = "Example var - token for SUT"
  type        = string
}

# Some variables that you can reuse.

# You will probably need these to create ec2 loader instance.
# You should set values for these variables in supabench.

variable "ec2_name" {
  description = "Name of ec2 loader instance"
  type        = string
  default     = "supaloader" # run ID
}

variable "instance_type" {
  description = "Size of ec2 loader instance"
  type        = string
  default     = "t2.micro"
}

variable "ami_id" {
  description = "AMI to use for ec2 loader instance"
  type        = string
}

variable "security_group_id" {
  description = "Security group to use for ec2 loader instance"
  type        = string
}

variable "subnet_id" {
  description = "Subnet to use for ec2 loader instance"
  type        = string
}

variable "instance_user" {
  description = "The instance user for sshing"
  type        = string
  default     = "admin"
}

variable "key_name" {
  description = "The instance key"
  type        = string
}

variable "private_key_location" {
  description = "Location of your private key to SSH into the instance"
  type        = string
}

variable "sut_name" {
  description = "Name of the system under test"
  type        = string
  default     = ""
}

# Leave these variables as is. They will be passed by Supabench. 
# You don't need to set values for it.

variable "testrun_name" {
  description = "Name of the testrun"
  type        = string
}

variable "testrun_id" {
  description = "ID of the testrun"
  type        = string
}

variable "test_origin" {
  description = "Origin of the test"
  type        = string
  default     = ""
}

variable "benchmark_id" {
  description = "ID of the benchmark"
  type        = string
}

variable "supabench_token" {
  description = "Token to access the supabench"
  type        = string
  sensitive   = true
}

variable "supabench_uri" {
  description = "URI of the supabench server"
  type        = string
}
