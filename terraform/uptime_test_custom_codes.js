const apiKey = 'u3361689-70eb43d5171c14f6889360b5';
fetch("https://api.uptimerobot.com/v2/editMonitor", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `api_key=${apiKey}&format=json&id=802530584&custom_http_statuses=` + encodeURIComponent('{}')
}).then(r => r.json()).then(res => {
  console.log("Empty statuses result:", JSON.stringify(res, null, 2));
}).catch(console.error);
