variable "ec2_name" {
  description = "Name of ec2 loader instance"
  type        = string
  default     = "supaloader" # run ID
}

variable "instances_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 8
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

variable "conns" {
  description = "Number of connections to the system under test"
  type        = string
  default     = "4"
}

variable "rooms" {
  description = "Number of realtime rooms"
  type        = string
  default     = "1"
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

variable "gen_load" {
  description = "Flag to signal if need to gen load"
  type        = bool
}

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
  description = "Token to access the reports"
  type        = string
}

variable "supabench_uri" {
  description = "URI of the supabench server"
  type        = string
}