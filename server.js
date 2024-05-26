// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));  // Serve static files from the 'public' directory

// Initialize the OpenAI client with SDK version 4
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Assuming the API key is stored in an environment variable
});

app.post('/translate', async (req, res) => {
    try {
        const texts = req.body.texts; // An array of texts
        let translatedTexts = await Promise.all(texts.map(text => {
            return openai.chat.completions.create({
                model: "gpt-4o", // Use the latest model
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
