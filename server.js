require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize the OpenAI client with SDK version 4
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY 
});

let languageMapping = {}; // In-memory storage for language mappings

/**
 * Route to handle saving the API key, selected languages, selected model, batch size, show advanced settings, and auto-generate .mo files.
 */
app.post('/save-settings', (req, res) => {
    const { apiKey, selectedLanguages, selectedModel, batchSize, showAdvancedSettings, autoGenerateMoFiles } = req.body;

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
        envConfig.SHOW_ADVANCED_SETTINGS = showAdvancedSettings.toString();
        envConfig.AUTO_GENERATE_MO = autoGenerateMoFiles.toString();

        const envString = Object.entries(envConfig).map(([key, value]) => `${key}=${value}`).join('\n');
        
        // Check for write permissions before attempting to write
        fs.access(envFilePath, fs.constants.W_OK, (err) => {
            if (err) {
                console.error('No write permission for .env file:', err);
                return res.status(500).json({ message: 'No write permission for .env file' });
            }

            fs.writeFileSync(envFilePath, envString);
            openai.apiKey = apiKey;
            res.json({ message: 'Settings saved successfully' });
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Failed to save settings' });
    }
});

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
    const showAdvancedSettings = envConfig.SHOW_ADVANCED_SETTINGS === 'true';
    const autoGenerateMoFiles = envConfig.AUTO_GENERATE_MO === 'true';
    res.json({ apiKey, selectedLanguages, selectedModel, batchSize, showAdvancedSettings, autoGenerateMoFiles });
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
                messages: [
                    {
                      role: "user",
                      content: `Imagine you are the world's best human translator that follows rules exactly without deviating. Please translate the following text to ${languageName}.
                  
                  Follow these guidelines strictly:
                  1. Translate the text into the selected language.
                  2. If you find any quotation marks ("), you must escape them with a backslash (e.g., \").
                  3. Any quotation marks in translated sentences (") must be escaped with a backslash (e.g., \").
                  4. Do not use HTML entities like &quot; for quotation marks. You must always use escaped quotation marks (e.g., \").
                  5. Do not double-escape any words (e.g., \\\").
                  6. Do not add any extra quotation marks (") to any of the translated words.
                  7. It is crucial that you translate only the text provided. Do not include any additional words, pleasantries, or remarks.
                  8. Do not escape any other punctuation marks (e.g., ! & ? ; :).
                  9. Ensure that punctuation marks such as question marks (?), followed by a quotation mark (") are not repeated or duplicated.
                  10. If the translated word is the same as the original text, return only the text. Don't add the instructions above to the translated text.
                  11. If you're unsure of the correct translation, reply with a blank space. Don't reply with --.
                  
                  ---
                  Literal text to translate: ${text}`
                    }
                  ]
                                                                     
            }).then(response => response.choices[0].message.content.trim());
        }));

        res.json({ translatedTexts: translations });
    } catch (error) {
        console.error('Error processing translations:', error);
        res.status(500).json({ error: 'Failed to process translations' });
    }
});

const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please choose another port.`);
    } else {
        console.error(`Server error: ${err.message}`);
    }
    process.exit(1);
});
