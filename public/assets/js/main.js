// Import necessary functions from other modules
import { initializeFileUpload, initializeTranslateButton, initializeLanguageSelect } from './fileProcessor.js';
import { initializeFileCheckIcon } from './translator.js';
import { saveSettings, loadSettings, setTabListeners } from './settings.js';

let choicesInstance;

// Function to initialize event listeners once the DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to the DOM elements for the save button, API key input, and language select dropdown
    const saveBtn = document.getElementById('saveBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const languageSelect = document.getElementById('languageSelect');

    // Initialize file upload functionality
    initializeFileUpload();

    // Initialize the translate button functionality
    initializeTranslateButton();

    // Initialize the file check icon functionality
    initializeFileCheckIcon();

    // Initialize the language select dropdown with Choices.js and store the instance
    choicesInstance = initializeLanguageSelect();

    // Load the settings (API key and selected language) on page load
    loadSettings(choicesInstance);

    // Set up event listeners for tab navigation
    setTabListeners();

    // Add event listener to the save button to save the settings when clicked
    saveBtn.addEventListener('click', () => {
        // Get the values of the API key and selected language from the inputs
        const apiKey = apiKeyInput.value;
        const selectedLanguage = languageSelect.value;

        // Call the function to save the settings
        saveSettings(apiKey, selectedLanguage);
    });
});
