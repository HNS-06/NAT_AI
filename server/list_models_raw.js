const https = require('https');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log(`Fetching models from: ${url.replace(API_KEY, 'HIDDEN')}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else {
                console.log("Models found:", json.models ? json.models.length : 0);
                const fs = require('fs');
                fs.writeFileSync('available_models.json', JSON.stringify(json, null, 2));
                console.log("Saved to available_models.json");

                if (json.models) {
                    json.models.forEach(m => {
                        if (m.name.includes('gemini')) {
                            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Parse Error:", e.message);
            console.log("Raw Data:", data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
