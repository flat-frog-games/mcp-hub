data "aws_ssm_parameter" "uptimerobot_api_key_secure" {
  name            = "/arundel-cloud/mcp/uptimerobot_api_key"
  with_decryption = true
}

provider "uptimerobot" {
  api_key = data.aws_ssm_parameter.uptimerobot_api_key_secure.value
}

resource "uptimerobot_monitor" "mcp_waf_check" {
  name          = "MCP - WAF Check"
  type          = "HEARTBEAT"
  url           = "https://heartbeat.uptimerobot.com/m802539459-9aa30dda4a2acb4c1bdc46d9c59b3624a3bde07e"
  interval      = 300
  grace_period  = 300

  assigned_alert_contacts = [
    {
      alert_contact_id = "8223299"
      threshold        = 0
      recurrence       = 0
    },
    {
      alert_contact_id = "8217018"
      threshold        = 0
      recurrence       = 0
    }
  ]
}

resource "uptimerobot_monitor" "mcp_hub" {
  name              = "mcp.flatfrog.games"
  type              = "KEYWORD"
  url               = "https://mcp.flatfrog.games/health/deep"
  keyword_type      = "ALERT_NOT_EXISTS"
  keyword_value     = "OK"
  keyword_case_type = "CaseSensitive"
  interval          = 60

  assigned_alert_contacts = [
    {
      alert_contact_id = "8223299"
      threshold        = 0
      recurrence       = 0
    },
    {
      alert_contact_id = "8217018"
      threshold        = 0
      recurrence       = 0
    }
  ]
}

resource "uptimerobot_monitor" "ser_toadington" {
  name          = "ser-toadington (TF)"
  type          = "HTTP"
  url           = "https://api.flatfrog.games/sertoadington/health"
  interval      = 60

  assigned_alert_contacts = [
    {
      alert_contact_id = "8223299"
      threshold        = 0
      recurrence       = 0
    },
    {
      alert_contact_id = "8217018"
      threshold        = 0
      recurrence       = 0
    }
  ]
}
