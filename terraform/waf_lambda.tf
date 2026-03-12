

resource "aws_iam_role" "mcp_waf_check_role" {
  name = "mcp-waf-check-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "mcp_waf_check_basic_exec" {
  role       = aws_iam_role.mcp_waf_check_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# The Heartbeat URL to ping UptimeRobot to let it know the WAF is still secure.
resource "aws_ssm_parameter" "uptimerobot_heartbeat_url" {
  name  = "/arundel-cloud/mcp/uptimerobot_heartbeat_url"
  type  = "SecureString"
  value = "https://heartbeat.uptimerobot.com/m802539459-9aa30dda4a2acb4c1bdc46d9c59b3624a3bde07e"

}

resource "aws_lambda_function" "mcp_waf_check" {
  filename         = "${path.module}/src/bootstrap.zip"
  function_name    = "mcp-waf-check"
  role             = aws_iam_role.mcp_waf_check_role.arn
  handler          = "bootstrap"
  runtime          = "provided.al2023"
  architectures    = ["arm64"]
  timeout          = 15

  environment {
    variables = {
      MCP_URL       = "https://mcp.flatfrog.games/health"
      HEARTBEAT_URL = aws_ssm_parameter.uptimerobot_heartbeat_url.value
    }
  }
}


resource "aws_cloudwatch_event_rule" "every_five_minutes" {
  name                = "mcp-waf-check-every-five-minutes"
  description         = "Fires every 5 minutes to test external MCP access"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "waf_check_target" {
  rule      = aws_cloudwatch_event_rule.every_five_minutes.name
  target_id = "mcp-waf-check"
  arn       = aws_lambda_function.mcp_waf_check.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_waf_check" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mcp_waf_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_five_minutes.arn
}
