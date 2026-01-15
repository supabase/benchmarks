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

variable "instances_count" {
  description = "Number of EC2 instances (should be even)"
  type        = number
  default     = 8
}

variable "ec2_name" {
  description = "Name of ec2 loader instance"
  type        = string
  default     = "supaloader" # run ID
}

variable "instance_type" {
  description = "Size of ec2 loader instance"
  type        = string
  default     = "t2.micro" # c5.4xlarge
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

variable "rate" {
  description = "Rate of the system under test"
  type        = string
  default     = "1"
}

variable "duration" {
  description = "Duration of the test"
  type        = string
  default     = "60"
}

# TPC-B configuration
variable "convex_url" {
  description = "Convex deployment URL"
  type        = string
}

variable "scale_factor" {
  description = "TPC-B scale factor"
  type        = string
  default     = "10"
}

variable "conns" {
  description = "Number of connections"
  type        = string
  default     = "10"
}

variable "requests" {
  description = "Number of requests"
  type        = string
  default     = "10"
}

variable "ramping_duration" {
  description = "Ramping duration in seconds"
  type        = string
  default     = "10"
}

variable "consecutive_duration" {
  description = "Consecutive duration in seconds"
  type        = string
  default     = "20"
}

variable "ramps_count" {
  description = "Number of ramps"
  type        = string
  default     = "1"
}


variable "app_name" {
  description = "Name of fly app"
  type        = string
  default     = "realtime-qa" # fly app name
}

variable "fly_access_token" {
  description = "Fly access token"
  type        = string
}

variable "app_nodes_count" {
  description = "Count of fly app nodes"
  type        = string
  default     = 6
}
