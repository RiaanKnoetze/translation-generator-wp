// Import necessary functions from other modules
import { initializeFileUpload, initializeTranslateButton, initializeLanguageSelect } from './fileProcessor.js';
import { initializeFileCheckIcon } from './translator.js';
import { saveSettings, loadSettings, setTabListeners } from './settings.js';

let choicesInstance;
let modelChoicesInstance;

// Function to initialize event listeners once the DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to the DOM elements for the save button, API key input, language select dropdown, and model select dropdown
    const saveBtn = document.getElementById('saveBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const languageSelect = document.getElementById('languageSelect');
    const modelSelect = document.getElementById('modelSelect');

    // Initialize file upload functionality
    initializeFileUpload();

    // Initialize the translate button functionality
    initializeTranslateButton();

    // Initialize the file check icon functionality
    initializeFileCheckIcon();

    // Initialize the language select dropdown with Choices.js and store the instance
    choicesInstance = initializeLanguageSelect();

    // Initialize the model select dropdown with Choices.js and store the instance
    modelChoicesInstance = new Choices(modelSelect, { removeItemButton: true });

    // Load the settings (API key, selected language, and selected model) on page load
    loadSettings(choicesInstance, modelChoicesInstance).then(() => {
        // Send the language mapping to the server after loading the settings
        sendLanguageMapping();
    });

    // Set up event listeners for tab navigation
    setTabListeners();

    // Extract language mapping from the select options
    function getLanguageMapping() {
        const options = languageSelect.options;
        const languageMapping = {};
        for (let i = 0; i < options.length; i++) {
            languageMapping[options[i].value] = options[i].text;
        }
        return languageMapping;
    }

    // Send language mapping to the server
    async function sendLanguageMapping() {
        const languageMapping = getLanguageMapping();
        try {
            await fetch('/set-language-mapping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ languageMapping })
            });
        } catch (error) {
            console.error('Error sending language mapping:', error);
        }
    }

    // Add event listener to the save button to save the settings and resend the language mapping when clicked
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value;
        const selectedLanguage = languageSelect.value;
        const selectedModel = modelSelect.value;
        saveSettings(apiKey, selectedLanguage, selectedModel).then(() => {
            sendLanguageMapping();
        });
    });
});
