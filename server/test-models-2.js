require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const candidates = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function test() {
    console.log("STARTING TEST");
    for (const name of candidates) {
        try {
            console.log(`Trying ${name}...`);
            const model = genAI.getGenerativeModel({ model: name });
            const r = await model.generateContent("Hi");
            console.log(`[SUCCESS] ${name}`);
        } catch (e) {
            console.log(`[FAIL] ${name}: ${e.message.split(' ').slice(0, 5).join(' ')}...`); // Short error
        }
    }
    console.log("DONE");
}
test();
