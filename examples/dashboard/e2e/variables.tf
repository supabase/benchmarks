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
  default = {
    eu-central-1 = "ami-0e4883c1c6a908b70"
    eu-west-2 = "ami-03c1dcccbda10b0d0"
  }
}

variable "security_group_id" {
  description = "Security group to use for ec2 loader instance"
  type        = string
  default = {
    eu-central-1 = "sg-0ea36fb65ce48f034"
    eu-west-2 = "sg-04c30e8430317ebc1"
  }
}

variable "subnet_id" {
  description = "Subnet to use for ec2 loader instance"
  default = {
    eu-central-1 = "subnet-f3ca66bf"
    eu-west-2 = "subnet-678ce11d"
  }
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

variable "conns" {
  description = "Number of connections to the system under test"
  type        = string
  default     = "4"
}

variable "duration" {
  description = "Duration of the test"
  type        = string
  default     = "60"
}

variable "pg_pass" {
  description = "Postgres instance password"
  type        = string
}

variable "pg_host" {
  description = "Postgres instance host"
  type        = string
  default     = "db.woopuegececriuknbjus.supabase.net"
}

variable "mp_token" {
  description = "Multiplayer realtime api token"
  type        = string
}

variable "mp_uri" {
  description = "Multiplayer realtime api uri"
  type        = string
  default     = "wss://woopuegececriuknbjus.realtime-qa.abc3.dev/socket/websocket"
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