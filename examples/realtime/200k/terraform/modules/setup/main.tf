resource "null_resource" "fly" {
  triggers = {
    app_name         = var.app_name
    fly_access_token = var.fly_access_token
  }

  provisioner "local-exec" {
    command = "/flyctl scale -a ${var.app_name} count ${var.app_nodes_count}"
    environment = {
      HOME             = path.module
      FLY_ACCESS_TOKEN = var.fly_access_token
    }
  }

  provisioner "local-exec" {
    when    = destroy
    command = "/flyctl scale -a ${self.triggers.app_name} count 0"
    environment = {
      HOME = path.module
      FLY_ACCESS_TOKEN = self.triggers.fly_access_token
    }
  }
}

output "ready" {
  # the value is not important because we're just
  # using this for its dependencies.
  value = {}

  # Anything that refers to this output must wait until
  # the actions for azurerm_monitor_diagnostic_setting.example
  # to have completed first.
  depends_on = [null_resource.fly]
}