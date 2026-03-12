variable "app_name" {
  description = "Name of fly app"
  type        = string
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