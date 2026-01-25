const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else {
                console.log("--- START MODELS ---");
                json.models.forEach(m => {
                    if (m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(m.name.replace('models/', ''));
                    }
                });
                console.log("--- END MODELS ---");
            }
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Network Error:", e);
});
