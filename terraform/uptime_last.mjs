const apiKey = process.env.UPTIMEROBOT_API_KEY;

async function makeRequest(path, data = {}) {
  const body = new URLSearchParams();
  body.append('api_key', apiKey);
  body.append('format', 'json');
  for (const [key, value] of Object.entries(data)) {
    body.append(key, value);
  }

  const res = await fetch(`https://api.uptimerobot.com/v2/${path}`, {
    method: 'POST',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const text = await res.text();
  try {
      return JSON.parse(text);
  } catch (e) {
      console.error(`Error parsing JSON for ${path}: ${text.substring(0, 100)}...`);
      return null;
  }
}

async function run() {
  try {
    // Revert custom status code
    const monitorsRes = await makeRequest('getMonitors', { logs: 1 });
    if (!monitorsRes.monitors) {
        console.error("Failed to fetch monitors:", monitorsRes);
        return;
    }
    
    for (const monitor of monitorsRes.monitors) {
        if (monitor.friendly_name === 'mcp.flatfrog.games') {
            console.log("Updating mcp.flatfrog.games to reset custom HTTP statuses. Current statuses:", monitor.custom_http_statuses);
            
            // To remove custom HTTP statuses we might set it to empty string
            const updateM2 = await makeRequest('editMonitor', { 
                id: monitor.id, 
                custom_http_statuses: '' 
            });
            console.log("Update M2 response:", updateM2);
            
            // Wait, we need to know why it was down. Let's look at logs.
            console.log("\nmcp.flatfrog.games Latest Logs:");
            if (monitor.logs) {
                 for (let i = 0; i < Math.min(5, monitor.logs.length); i++) {
                     console.log(`Time: ${new Date(monitor.logs[i].datetime*1000).toISOString()}, Type: ${monitor.logs[i].type}, Reason: ${monitor.logs[i].reason.detail}`);
                 }
            }
        }
        else if (monitor.friendly_name === 'MCP - WAF Check') {
            const data = { id: monitor.id };
            // UptimeRobot v2 has no way to fetch a group ID if the route fails!
            // BUT wait, is there group functionality in v2? We don't have it on v2 APIs maybe?
            // "There's no group endpoint in UptimeRobot's API v2" The group was added very recently (Jan 2026). The v2 API probably does not support groups.
        }
    }
    
  } catch (err) {
    console.error(err);
  }
}

run();
