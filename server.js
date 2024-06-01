// server.js
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

// Route to handle saving the API key and selected language
app.post('/save-settings', (req, res) => {
    const apiKey = req.body.apiKey;
    const selectedLanguage = req.body.selectedLanguage;

    if (!apiKey || !selectedLanguage) {
        return res.status(400).json({ message: 'API key and selected language are required' });
    }

    const envFilePath = path.resolve(__dirname, '.env');

    try {
        // Read existing .env file or create a new one if it doesn't exist
        let envConfig = {};
        if (fs.existsSync(envFilePath)) {
            envConfig = dotenv.parse(fs.readFileSync(envFilePath));
        }

        // Update the API key and selected language
        envConfig.OPENAI_API_KEY = apiKey;
        envConfig.SELECTED_LANGUAGE = selectedLanguage;

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

// Route to get the API key and selected language
app.get('/get-settings', (req, res) => {
    const envFilePath = path.resolve(__dirname, '.env');
    let envConfig = {};
    if (fs.existsSync(envFilePath)) {
        envConfig = dotenv.parse(fs.readFileSync(envFilePath));
    }
    const apiKey = envConfig.OPENAI_API_KEY || '';
    const selectedLanguage = envConfig.SELECTED_LANGUAGE || 'en_US';
    res.json({ apiKey, selectedLanguage });
});

app.post('/translate', async (req, res) => {
    try {
        const texts = req.body.texts; // An array of texts
        let translatedTexts = await Promise.all(texts.map(text => {
            return openai.chat.completions.create({
                model: "gpt-4", // Use the latest model
                messages: [{ role: "user", content: `Translate the following English text to French. Please translate only the text and don't write anything else: ${text}` }]
            }).then(response => response.choices[0].message.content.trim());
        }));
        res.json({ translatedTexts });
    } catch (error) {
        console.error('Error processing translations:', error);
        res.status(500).json({ error: 'Failed to process translations' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
