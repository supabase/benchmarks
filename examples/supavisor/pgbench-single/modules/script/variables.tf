# This block is related to your benchmark.
# Variables to pass to the benchmark script.
# Variables required to run the SUT infrastructure.

# Specify some variables that are required for your benchmark.

variable "anon_token" {
  description = "anon_token - anon token for the project"
  type        = string
}
variable "service_token" {
  description = "service_token - service token for the project"
  type        = string
}
variable "base_uri" {
  description = "base_uri - supabase project base uri"
  type        = string
  default     = "https://proj.supabase.red"
}
variable "conns" {
  description = "conns - number of virtual users"
  type        = string
  default     = "100"
}
variable "requests" {
  description = "requests - number of requests per virtual user"
  type        = string
  default     = "10"
}
variable "rampscount" {
  description = "rampscount - number of stages with ramping vus and holding them for a duration"
  type        = string
  default     = "10"
}
variable "rampingduration" {
  description = "rampingduration - duration of the ramping stage"
  type        = string
  default     = "30"
}
variable "consecutiveduration" {
  description = "consecutiveduration - duration of the consecutive requests stage"
  type        = string
  default     = "60"
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

variable "instances_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 1
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
  default     = "supavisor"
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
