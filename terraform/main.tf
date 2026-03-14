data "terraform_remote_state" "aws_ecs_core" {
  backend = "s3"
  config = {
    bucket  = "flatfrog.games"
    key     = "arundel.cloud/live/prod/aws_ecs_core/terraform.tfstate"
    region  = "eu-west-2"
  }
}

data "aws_ssm_parameter" "github_pat" {
  name = "/arundel-cloud/mcp/github_pat"
}

data "aws_ssm_parameter" "github_pat_flatfrog" {
  name = "/arundel-cloud/mcp/github_pat_flatfrog"
}

data "aws_ssm_parameter" "sentry_token" {
  name = "/arundel-cloud/mcp/sentry_token"
}

data "aws_ssm_parameter" "notion_api_token" {
  name = "/arundel-cloud/mcp/notion_api_token"
}

data "aws_ssm_parameter" "miro_api_token" {
  name = "/arundel-cloud/mcp/miro_api_token"
}

data "aws_ssm_parameter" "hub_api_key" {
  name = "/arundel-cloud/mcp/hub_api_key"
}

resource "aws_ecs_task_definition" "mcp_hub" {
  family                   = "mcp-hub"
  requires_compatibilities = ["EXTERNAL"]
  network_mode             = "bridge"
  execution_role_arn       = "arn:aws:iam::649968665109:role/ecsAnywhereRole"

  container_definitions = jsonencode([
    {
      name      = "mcp-hub"
      image     = "649968665109.dkr.ecr.eu-west-2.amazonaws.com/mcp-hub:v4"
      cpu       = 512
      memory    = 1024
      essential = true
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8083/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      portMappings = [
        {
          containerPort = 8083
          hostPort      = 8083
          protocol      = "tcp"
        }
      ]
      secrets = [
        {
          name      = "GITHUB_PAT"
          valueFrom = data.aws_ssm_parameter.github_pat.arn
        },
        {
          name      = "GITHUB_PAT_FLATFROG"
          valueFrom = data.aws_ssm_parameter.github_pat_flatfrog.arn
        },
        {
          name      = "SENTRY_TOKEN"
          valueFrom = data.aws_ssm_parameter.sentry_token.arn
        },
        {
          name      = "NOTION_API_TOKEN"
          valueFrom = data.aws_ssm_parameter.notion_api_token.arn
        },
        {
          name      = "MIRO_API_TOKEN"
          valueFrom = data.aws_ssm_parameter.miro_api_token.arn
        },
        {
          name      = "HUB_API_KEY"
          valueFrom = data.aws_ssm_parameter.hub_api_key.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/mcp-hub"
          "awslogs-region"        = "eu-west-2"
          "awslogs-stream-prefix" = "mcp"
          "awslogs-create-group"  = "true"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "mcp_hub" {
  name            = "flatfrog-mcp-hub"
  cluster         = data.terraform_remote_state.aws_ecs_core.outputs.cluster_id
  task_definition = aws_ecs_task_definition.mcp_hub.arn
  desired_count   = 1
  launch_type     = "EXTERNAL"

  tags = {
    CloudflareDNS = "mcp.svc.arundel.cloud"
  }

  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:node-type == flatfrog"
  }
}
