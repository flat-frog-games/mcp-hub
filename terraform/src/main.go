package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handleRequest(ctx context.Context, event events.CloudWatchEvent) (string, error) {
	mcpUrl := os.Getenv("MCP_URL")
	if mcpUrl == "" {
		mcpUrl = "https://mcp.flatfrog.games/health"
	}
	
	heartbeatUrl := os.Getenv("HEARTBEAT_URL")

	// Create new request
	req, err := http.NewRequestWithContext(ctx, "GET", mcpUrl, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}
	
	// Add user agent to try and blend in
	req.Header.Add("User-Agent", "WAF-Checker-Lambda/1.0")

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		return "", fmt.Errorf("connection failed, WAF verification inconclusive: %v", err)
	}
	defer resp.Body.Close()

	// Cloudflare WAF block returns 403
	if resp.StatusCode == 403 {
		fmt.Printf("✅ WAF is active securely blocked the request. Status: %d\n", resp.StatusCode)
		
		if heartbeatUrl != "" && len(heartbeatUrl) > 4 && heartbeatUrl[:4] == "http" {
			hbReq, _ := http.NewRequestWithContext(ctx, "GET", heartbeatUrl, nil)
			hbResp, hbErr := client.Do(hbReq)
			if hbErr != nil {
				fmt.Printf("Failed to send heartbeat: %v\n", hbErr)
			} else {
				hbResp.Body.Close()
				fmt.Println("✅ Heartbeat sent to UptimeRobot.")
			}
		} else {
			fmt.Println("⚠️ No UptimeRobot heartbeat URL configured yet.")
		}
		
		responseBytes, _ := json.Marshal("WAF Check Passed: Secure")
		return string(responseBytes), nil
	} else {
		errMsg := fmt.Sprintf("❌ WAF FAILED! Expected 403 Forbidden, got %d", resp.StatusCode)
		fmt.Println(errMsg)
		// Returning error causes Lambda failure which prevents heartbeat
		return "", fmt.Errorf("WAF FAILED! The MCP was exposed securely. Status: %d", resp.StatusCode)
	}
}

func main() {
	lambda.Start(handleRequest)
}
