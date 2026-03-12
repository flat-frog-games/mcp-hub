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
    let groupId;
    
    // Check if the group exists
    const groupsRes = await makeRequest('getMGroups');
    let group = groupsRes.mgroups ? groupsRes.mgroups.find(g => g.friendly_name === 'FlatFrog MCP') : null;
    
    if (group) {
        groupId = group.id;
        console.log("Using group 'FlatFrog MCP' with ID:", groupId);
    }
    
    // Get monitors
    const monitorsRes = await makeRequest('getMonitors', {});
    if (!monitorsRes.monitors) {
        console.error("Failed to fetch monitors:", monitorsRes);
        return;
    }
    
    for (const monitor of monitorsRes.monitors) {
        if (monitor.friendly_name === 'MCP - WAF Check') {
            const data = { id: monitor.id };
            if (groupId) data.mgroup_id = groupId;
            await makeRequest('editMonitor', data);
            console.log("Added WAF Check to Group.");
        } else if (monitor.friendly_name === 'mcp.flatfrog.games') {
            const data = { 
                id: monitor.id, 
                // Clear the custom HTTP statuses to default (200 OK is up) 
                // The UptimeRobot API might require us to set custom_http_statuses to empty string to reset. Let's try.
                custom_http_statuses: '' 
            };
            if (groupId) data.mgroup_id = groupId;
            await makeRequest('editMonitor', data);
            console.log("Added mcp.flatfrog.games to Group and reverted to expecting 200.");
        }
    }
    
    // Now let's fetch the monitors again with logs
    const monitorsLogs = await makeRequest('getMonitors', { logs: 1 });
    const targetMonitor = monitorsLogs.monitors.find(m => m.friendly_name === 'mcp.flatfrog.games');
    console.log("Monitor mcp.flatfrog.games logs:");
    if (targetMonitor && targetMonitor.logs) {
         console.log(JSON.stringify(targetMonitor.logs.slice(0, 5), null, 2));
    }
    
    console.log("Done!");
    
  } catch (err) {
    console.error(err);
  }
}

run();
