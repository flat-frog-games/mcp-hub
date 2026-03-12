const apiKey = process.env.UPTIMEROBOT_API_KEY;
fetch("https://api.uptimerobot.com/v2/getAccountDetails", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: `api_key=${apiKey}&format=json`
}).then(r => r.json()).then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(console.error);
