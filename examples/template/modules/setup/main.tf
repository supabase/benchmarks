resource "null_resource" "sut" {
  # Write your terraform here to run System Under Test.

  # Don't forget to add 'when = destroy' script to destroy the SUT after test is finished
  # if it is not provided by default with used provider.
}

output "ready" {
  # the value is not important because we're just
  # using this for its dependencies.
  value = {}

  # Anything that refers to this output must wait until
  # the actions for azurerm_monitor_diagnostic_setting.example
  # to have completed first.
  depends_on = [null_resource.sut]
}