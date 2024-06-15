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

let languageMapping = {}; // In-memory storage for language mappings

/**
 * Route to handle saving the API key, selected languages, selected model, and batch size.
 */
app.post('/save-settings', (req, res) => {
    const { apiKey, selectedLanguages, selectedModel, batchSize } = req.body;

    if (!apiKey || !selectedLanguages || !selectedModel || !batchSize) {
        return res.status(400).json({ message: 'API key, selected languages, selected model, and batch size are required' });
    }

    const envFilePath = path.resolve(__dirname, '.env');

    try {
        let envConfig = {};
        if (fs.existsSync(envFilePath)) {
            envConfig = dotenv.parse(fs.readFileSync(envFilePath));
        }

        envConfig.OPENAI_API_KEY = apiKey;
        envConfig.SELECTED_LANGUAGES = selectedLanguages.join(','); 
        envConfig.SELECTED_MODEL = selectedModel;
        envConfig.BATCH_SIZE = batchSize;

        const envString = Object.entries(envConfig).map(([key, value]) => `${key}=${value}`).join('\n');
        fs.writeFileSync(envFilePath, envString);

        openai.apiKey = apiKey;

        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Failed to save settings' });
    }
});

/**
 * Route to get the API key, selected languages, selected model, and batch size.
 */
app.get('/get-settings', (req, res) => {
    const envFilePath = path.resolve(__dirname, '.env');
    let envConfig = {};
    if (fs.existsSync(envFilePath)) {
        envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    }
    const apiKey = envConfig.OPENAI_API_KEY || '';
    const selectedLanguages = (envConfig.SELECTED_LANGUAGES || 'en_US').split(',');
    const selectedModel = envConfig.SELECTED_MODEL || 'gpt-4o';
    const batchSize = envConfig.BATCH_SIZE || '10';
    res.json({ apiKey, selectedLanguages, selectedModel, batchSize });
});

/**
 * Route to receive language mapping from the frontend.
 */
app.post('/set-language-mapping', (req, res) => {
    languageMapping = req.body.languageMapping;
    res.json({ message: 'Language mapping set successfully' });
});

/**
 * Route to handle translation.
 */
app.post('/translate', async (req, res) => {
    try {
        const { texts, language } = req.body;
        const languageName = languageMapping[language];

        if (!languageName) {
            return res.status(400).json({ error: 'Unsupported language code' });
        }

        const model = process.env.SELECTED_MODEL || 'gpt-4o';

        const translations = await Promise.all(texts.map(text => {
            return openai.chat.completions.create({
                model: model,
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
