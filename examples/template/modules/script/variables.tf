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

