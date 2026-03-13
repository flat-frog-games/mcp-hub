resource "aws_cloudwatch_metric_alarm" "mcp_hub_cpu" {
  alarm_name          = "mcp-hub-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors active mcp-hub cpu utilization"
  
  dimensions = {
    ClusterName = "arundel-cloud-ecs"
    ServiceName = aws_ecs_service.mcp_hub.name
  }
}

resource "aws_cloudwatch_metric_alarm" "mcp_hub_memory" {
  alarm_name          = "mcp-hub-memory-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors active mcp-hub memory utilization"

  dimensions = {
    ClusterName = "arundel-cloud-ecs"
    ServiceName = aws_ecs_service.mcp_hub.name
  }
}
