const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Prompts for Personality Modes
const SYSTEM_PROMPTS = {
    default: "You are Nat, a friendly, helpful, and intelligent AI assistant. You are witty, approachable, and love to help.",
    professional: "You are Nat, a highly professional and efficient AI consultant. Your responses are concise, formal, and strictly business-oriented. Focus on accuracy and productivity.",
    creative: "You are Nat, a creative muse. You speak in a colorful, imaginative way. You love brainstorming, storytelling, and thinking outside the box. Use metaphors and vivid language.",
    coder: "You are Nat, an expert software engineer. You provide clean, optimized code solutions. You explain technical concepts clearly and focus on best practices."
};

// Simple JSON DB
const DB_FILE = path.join(__dirname, 'db.json');

async function getDB() {
    try {
        if (!await fs.pathExists(DB_FILE)) {
            const initialDB = {
                users: {}, // principal -> profile
                conversations: {}, // id -> conversation
                files: [] // list of uploaded files
            };
            await fs.writeJson(DB_FILE, initialDB);
            return initialDB;
        }
        return await fs.readJson(DB_FILE);
    } catch (error) {
        console.error("Error reading DB:", error);
        return { users: {}, conversations: {}, files: [] };
    }
}

async function saveDB(data) {
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// --- Routes ---

// Get User Profile
app.get('/api/profile', async (req, res) => {
    const userId = "local-user-principal";
    const db = await getDB();
    const profile = db.users[userId];
    res.json(profile || null);
});

// Save User Profile
app.post('/api/profile', async (req, res) => {
    const { name, preferences } = req.body;
    const userId = "local-user-principal";

    const db = await getDB();
    const profile = {
        id: userId,
        name,
        preferences: preferences || {
            voiceEnabled: true,
            theme: 'glassmorphic',
            language: 'en',
            notifications: true
        }
    };

    db.users[userId] = profile;
    await saveDB(db);
    res.json(profile);
});

// Get User Conversations
app.get('/api/conversations', async (req, res) => {
    const userId = "local-user-principal";
    const db = await getDB();
    const conversations = Object.values(db.conversations)
        .filter(c => c.user === userId)
        .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    res.json(conversations);
});

// Get Single Conversation
app.get('/api/conversations/:id', async (req, res) => {
    const { id } = req.params;
    const db = await getDB();
    const conversation = db.conversations[id];
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json(conversation);
});

// Create Conversation
app.post('/api/conversations', async (req, res) => {
    const { id } = req.body;
    const convoId = id || uuidv4();
    const userId = "local-user-principal";

    const db = await getDB();

    const newConversation = {
        id: convoId,
        user: userId,
        messages: [],
        startTime: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };

    db.conversations[convoId] = newConversation;
    await saveDB(db);
    res.json(newConversation);
});

// Delete All Conversations
app.delete('/api/conversations', async (req, res) => {
    const userId = "local-user-principal";
    const db = await getDB();

    const newConversations = {};
    for (const [id, convo] of Object.entries(db.conversations)) {
        if (convo.user !== userId) {
            newConversations[id] = convo; // Keep other users' chats
        }
    }

    db.conversations = newConversations;
    await saveDB(db);
    res.json({ success: true });
});

// Delete Conversation
app.delete('/api/conversations/:id', async (req, res) => {
    const { id } = req.params;
    const userId = "local-user-principal";

    const db = await getDB();

    if (!db.conversations[id]) {
        return res.status(404).json({ error: "Conversation not found" });
    }

    if (db.conversations[id].user !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    delete db.conversations[id];
    await saveDB(db);
    res.json({ success: true });
});

// Helper to file to GenerativePart
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: fs.readFileSync(path).toString("base64"),
            mimeType
        },
    };
}

// Add Message & Generate Response
app.post('/api/conversations/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { content, sender, messageType, mode, fileId } = req.body; // Added mode and fileId
    const userId = "local-user-principal";

    const db = await getDB();
    const conversation = db.conversations[id];
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    // 1. Save User Message
    const userMessage = {
        id: uuidv4(),
        sender: sender || 'user',
        content,
        timestamp: new Date().toISOString(),
        messageType: messageType || 'text',
        fileId // store reference
    };

    conversation.messages.push(userMessage);
    conversation.lastActive = new Date().toISOString();

    // 2. Generate AI Response
    let aiMessage = null;
    if (sender === 'user') {
        try {
            // Context Memory: Get User Profile
            const profile = db.users[userId];
            const userName = profile ? profile.name : "User";

            // Construct System Instruction
            const baseSystemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS['default'];
            const contextPrompt = `\nYou are speaking to ${userName}. Context: The user prefers ${profile?.preferences?.theme || 'default'} theme.`;
            const systemInstruction = baseSystemPrompt + contextPrompt;

            // Model Fallback Strategy
            // Model Fallback Strategy
            const MODELS = [
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-2.0-flash-001",
            ];

            let responseText = null;
            let lastError = null;

            for (const modelName of MODELS) {
                try {
                    console.log(`Attempting with model: ${modelName}`);
                    const model = genAI.getGenerativeModel({ model: modelName });

                    // Prepare History (re-map for each attempt to be safe)
                    const history = conversation.messages.slice(-10).map(m => {
                        return {
                            role: m.sender === 'user' ? 'user' : 'model',
                            parts: [{ text: m.content }]
                        };
                    });

                    // Prepend System Prompt
                    const finalContent = `${systemInstruction}\n\nUser: ${content}`;
                    const promptParts = [finalContent];

                    // Handle File Attachment (Multimodal) reuse logic
                    if (fileId) {
                        const fileRec = db.files.find(f => f.id === fileId);
                        if (fileRec) {
                            const filePath = path.join(__dirname, fileRec.path);
                            if (fs.existsSync(filePath)) {
                                if (fileRec.fileType === 'image') {
                                    const ext = path.extname(filePath).toLowerCase();
                                    let mimeType = "image/png";
                                    if (ext === '.jpg' || ext === '.jpeg') mimeType = "image/jpeg";
                                    if (ext === '.webp') mimeType = "image/webp";
                                    promptParts.push(fileToGenerativePart(filePath, mimeType));
                                } else {
                                    try {
                                        const fileContent = fs.readFileSync(filePath, 'utf8');
                                        promptParts.push(`\n\n[Attached File: ${fileRec.fileName}]\n${fileContent}\n[End of File]`);
                                    } catch (e) { console.log("Text read error", e); }
                                }
                            }
                        }
                    }

                    const chat = model.startChat({
                        history: history.slice(0, -1),
                    });

                    const result = await chat.sendMessage(promptParts);
                    responseText = result.response.text();

                    // If we got here, success!
                    console.log(`Success with model: ${modelName}`);
                    break;
                } catch (error) {
                    console.error(`Failed with model ${modelName}:`, error.message);
                    lastError = error;
                    // Provide a small delay before next model to avoid hammering
                    await new Promise(r => setTimeout(r, 1000));
                    continue; // Try next model
                }
            }

            if (!responseText) {
                throw lastError || new Error("All models failed");
            }

            aiMessage = {
                id: uuidv4(),
                sender: 'ai',
                content: responseText,
                timestamp: new Date().toISOString(),
                messageType: 'text'
            };

            conversation.messages.push(aiMessage);
            conversation.lastActive = new Date().toISOString();

        } catch (error) {
            console.error("Gemini Error:", error);
            try {
                fs.appendFileSync(path.join(__dirname, 'error.log'), `${new Date().toISOString()} - Error: ${error.message}\n${JSON.stringify(error, null, 2)}\n`);
            } catch (e) { console.error("Could not write log", e); }

            aiMessage = {
                id: uuidv4(),
                sender: 'ai',
                content: `Error: ${error.message || "Unknown error"}. Please check server logs.`,
                timestamp: new Date().toISOString(),
                messageType: 'text'
            };
            conversation.messages.push(aiMessage);
        }
    }

    db.conversations[id] = conversation;
    await saveDB(db);

    res.json({ success: true, aiMessage });
});

// Upload File
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const userId = "local-user-principal";
    const db = await getDB();

    const uploadedFile = {
        id: uuidv4(),
        user: userId,
        fileName: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        fileType: req.body.fileType || 'document',
        uploadTime: new Date().toISOString()
    };

    db.files.push(uploadedFile);
    await saveDB(db);

    res.json(uploadedFile);
});

// Get Uploaded Files
app.get('/api/files', async (req, res) => {
    const userId = "local-user-principal";
    const db = await getDB();
    const userFiles = db.files.filter(f => f.user === userId);
    res.json(userFiles);
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
