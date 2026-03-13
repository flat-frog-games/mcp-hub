---
description: How to add monitoring and alerting to Flat Frog Games services
---
# Monitoring and Alerting Guide for Flat Frog Games

This workflow defines the standard process for adding monitoring to new services and ensuring alerts are correctly delivered to Google Chat.

## 1. Deep Health Checks
All services should expose a `/health/deep` endpoint.
- This endpoint should verify not just that the server is responding, but also that its underlying dependencies (e.g., database, external APIs) are functional.
- It must return a `200 OK` status and the text `OK` when healthy.
- If unhealthy, it should return a non-200 status code (e.g., `500 Internal Server Error`) or text indicating the failure point.

## 2. Infrastructure Alarms (CloudWatch)
Use Terraform to define CloudWatch alarms for ECS Services or Lambda Functions.
- **CPU & Memory**: Monitor active resource utilization. Set alarms if `CPUUtilization` or `MemoryUtilization` exceed 80% for multiple periods.
- Put these alarms in the Terraform workspace of the service itself (e.g., `mcp-hub/terraform/cloudwatch.tf`).

## 3. External Monitoring (UptimeRobot)
We use UptimeRobot to monitor external availability and SSL certificate expiration.
- Add the Terraform resource for the UptimeRobot monitor in the centralized infra repository (`ser-toadington/infra/uptime_robot.tf`).
- **Target URL**: Point the monitor to the service's `/health/deep` endpoint.
- **Check Type**: Use `KEYWORD` (not standard HTTP). Set `keyword_type = "ALERT_NOT_EXISTS"` and `keyword_value = "OK"`. This ensures the monitor explicitly fails if the API stops returning "OK" cleanly.
- **SSL Monitoring**: Always enable SSL certificate expiry monitoring, checking 7, 14, and 30 days before expiration.

## 4. Google Chat Alert Integration Challenges
When creating a new alert contact in UptimeRobot to send notifications to Google Chat, **DO NOT** use the "Webhook" contact type.

**The Trap:**
- UptimeRobot's standard "Webhook" type sends a complex JSON payload that Google Chat's webhook receiver does not natively understand (Google Chat expects `{"text": "<message>"}`).
- If you use the standard Webhook, the messages will fail silently on Google's end with a 400 Bad Request if the payload isn't transformed.

**The Solution:**
- Always use the native **"Google Chat"** contact type inside the UptimeRobot dashboard.
- This native integration handles the payload transformation automatically and delivers the alert correctly.
- Ensure the UptimeRobot Terraform resources reference the correct *Google Chat* contact ID from AWS SSM.
