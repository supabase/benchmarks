resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 4
  min_capacity       = 4
  resource_id        = ""
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  provisioner "local-exec" {
    when    = destroy
    command = "/aws"
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "ready" {
  # the value is not important because we're just
  # using this for its dependencies.
  value = {}

  # Anything that refers to this output must wait until
  # the actions for azurerm_monitor_diagnostic_setting.example
  # to have completed first.
  depends_on = [aws_appautoscaling_target.ecs_target]
}