require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("Testing Gemini API...");
console.log("API Key exists:", !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    console.log("\n=== Testing Available Models ===\n");

    // ✅ CORRECT MODEL NAMES (from your available-models.json):
    const modelsToTest = [
        "gemini-2.0-flash-001",      // Most stable
        "gemini-pro-latest",         // Latest pro version
        "gemini-flash-latest",       // Latest flash version
        "gemini-2.0-flash",          // Alternative
        "gemini-2.5-flash",          // Newer version
        "gemini-2.5-pro"             // If available
    ];

    for (const modelName of modelsToTest) {
        try {
            console.log(`\n🧪 Testing: ${modelName}`);

            // Create model instance
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 100,
                }
            });

            // Generate content
            const result = await model.generateContent("Hello, respond with just 'Working' if you can hear me.");
            const response = await result.response;

            console.log(`✅ ${modelName}: SUCCESS!`);
            console.log(`   Response: "${response.text().trim()}"`);

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.log(`❌ ${modelName}: FAILED`);
            console.log(`   Error: ${error.message}`);

            // Check for specific error types
            if (error.message.includes('404')) {
                console.log(`   → Model not found. Try different name.`);
            } else if (error.message.includes('429')) {
                console.log(`   → Rate limit exceeded. Wait and try again.`);
            } else if (error.message.includes('quota')) {
                console.log(`   → Quota exceeded. Check billing.`);
            } else if (error.message.includes('API key')) {
                console.log(`   → Invalid API key. Check .env file.`);
            }
        }
    }

    console.log("\n=== Testing Complete ===\n");

    // Test with just the most reliable model
    console.log("🔍 Final test with most reliable model...");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-001"
        });
        const result = await model.generateContent("What is 2+2?");
        const response = await result.response;
        console.log(`✅ gemini-2.0-flash-001: "${response.text().trim()}"`);
    } catch (error) {
        console.log(`❌ Ultimate test failed: ${error.message}`);
        console.log("\n📋 TROUBLESHOOTING:");
        console.log("1. Check .env file has GEMINI_API_KEY=your_key");
        console.log("2. Visit: https://aistudio.google.com/app/apikey");
        console.log("3. Ensure billing is enabled (if required)");
        console.log("4. Try different model from list above");
    }
}

// Run the test
test().catch(console.error);