require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); 

// Initialize the OpenAI client with SDK version 4
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
});

// In-memory storage for language mappings
let languageMapping = {};

// Route to handle saving the API key, selected language, and selected model
app.post('/save-settings', (req, res) => {
    const apiKey = req.body.apiKey;
    const selectedLanguage = req.body.selectedLanguage;
    const selectedModel = req.body.selectedModel;

    if (!apiKey || !selectedLanguage || !selectedModel) {
        return res.status(400).json({ message: 'API key, selected language, and selected model are required' });
    }

    const envFilePath = path.resolve(__dirname, '.env');

    try {
        // Read existing .env file or create a new one if it doesn't exist
        let envConfig = {};
        if (fs.existsSync(envFilePath)) {
            envConfig = dotenv.parse(fs.readFileSync(envFilePath));
        }

        // Update the API key, selected language, and selected model
        envConfig.OPENAI_API_KEY = apiKey;
        envConfig.SELECTED_LANGUAGE = selectedLanguage;
        envConfig.SELECTED_MODEL = selectedModel;

        // Write back to the .env file
        const envString = Object.entries(envConfig).map(([key, value]) => `${key}=${value}`).join('\n');
        fs.writeFileSync(envFilePath, envString);

        // Re-initialize OpenAI client with new API key
        openai.apiKey = apiKey;

        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Failed to save settings' });
    }
});

// Route to get the API key, selected language, and selected model
app.get('/get-settings', (req, res) => {
    const envFilePath = path.resolve(__dirname, '.env');
    let envConfig = {};
    if (fs.existsSync(envFilePath)) {
        envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    }
    const apiKey = envConfig.OPENAI_API_KEY || '';
    const selectedLanguage = envConfig.SELECTED_LANGUAGE || 'en_US';
    const selectedModel = envConfig.SELECTED_MODEL || 'gpt-4o';
    res.json({ apiKey, selectedLanguage, selectedModel });
});

// Route to receive language mapping from frontend
app.post('/set-language-mapping', (req, res) => {
    languageMapping = req.body.languageMapping;
    res.json({ message: 'Language mapping set successfully' });
});

// Route to handle translation
app.post('/translate', async (req, res) => {
    try {
        const { texts, language } = req.body; // Get texts and target language from the request body
        const languageName = languageMapping[language]; // Map the language code to language name

        if (!languageName) {
            return res.status(400).json({ error: 'Unsupported language code' });
        }

        const model = process.env.SELECTED_MODEL || 'gpt-4o'; // Use the selected model or default to gpt-4

        const translations = await Promise.all(texts.map(text => {
            return openai.chat.completions.create({
                model: model, // Use the selected model
                messages: [{ role: "user", content: `Translate the following text to ${languageName}. When needed, use the formal form of "you". Please translate only the text and don't write anything else. Don't add extra periods at the end of sentences if the original doesn't have them. Text to translate: ${text}` }]
            }).then(response => response.choices[0].message.content.trim());
        }));
        res.json({ translatedTexts: translations });
    } catch (error) {
        console.error('Error processing translations:', error);
        res.status(500).json({ error: 'Failed to process translations' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
