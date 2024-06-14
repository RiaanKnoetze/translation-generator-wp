import { initializeFileUpload, initializeTranslateButton, initializeLanguageSelect, initializeDragAndDrop } from './fileProcessor.js';
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
    const batchSizeInput = document.getElementById('batchSize'); // Add batch size input reference

    // Initialize file upload functionality
    initializeFileUpload();

    // Initialize the translate button functionality
    initializeTranslateButton();

    // Initialize the language select dropdown with Choices.js and store the instance
    choicesInstance = initializeLanguageSelect();

    // Initialize the model select dropdown with Choices.js and store the instance
    modelChoicesInstance = new Choices(modelSelect, { removeItemButton: true });

    // Load the settings (API key, selected languages, selected model, and batch size) on page load
    loadSettings(choicesInstance, modelChoicesInstance).then(() => {
        // Send the language mapping to the server after loading the settings
        sendLanguageMapping();
    });

    // Set up event listeners for tab navigation
    setTabListeners();

    // Initialize drag and drop functionality
    initializeDragAndDrop();

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
        const selectedLanguages = Array.from(languageSelect.selectedOptions).map(option => option.value);
        const selectedModel = modelSelect.value;
        const batchSize = batchSizeInput.value; // Get batch size value
        saveSettings(apiKey, selectedLanguages, selectedModel, batchSize).then(() => {
            sendLanguageMapping();
        });
    });

    // Hamburger menu functionality
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const slidingMenu = document.getElementById('slidingMenu');
    const tabTranslate = document.getElementById('tabTranslate');
    const tabSettings = document.getElementById('tabSettings');
    const tabTranslateDesktop = document.getElementById('tabTranslateDesktop');
    const tabSettingsDesktop = document.getElementById('tabSettingsDesktop');

    hamburgerBtn.addEventListener('click', function () {
        slidingMenu.classList.remove('-translate-x-full');
        slidingMenu.setAttribute('aria-hidden', 'false');
        closeMenuBtn.focus();
    });

    closeMenuBtn.addEventListener('click', function () {
        slidingMenu.classList.add('-translate-x-full');
        slidingMenu.setAttribute('aria-hidden', 'true');
        hamburgerBtn.focus();
    });

    tabTranslate.addEventListener('click', function () {
        tabTranslate.classList.add('active');
        tabSettings.classList.remove('active');
        tabTranslateDesktop.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabSettingsDesktop.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        slidingMenu.classList.add('-translate-x-full');
        slidingMenu.setAttribute('aria-hidden', 'true');
        document.getElementById('translateContainer').focus();
    });

    tabSettings.addEventListener('click', function () {
        tabSettings.classList.add('active');
        tabTranslate.classList.remove('active');
        tabSettingsDesktop.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabTranslateDesktop.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        slidingMenu.classList.add('-translate-x-full');
        slidingMenu.setAttribute('aria-hidden', 'true');
        document.getElementById('settingsContainer').focus();
    });

    tabTranslateDesktop.addEventListener('click', function () {
        tabTranslateDesktop.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabSettingsDesktop.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        document.getElementById('translateContainer').classList.add('active');
        document.getElementById('settingsContainer').classList.remove('active');
        document.getElementById('translateContainer').focus();
    });

    tabSettingsDesktop.addEventListener('click', function () {
        tabSettingsDesktop.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabTranslateDesktop.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        document.getElementById('settingsContainer').classList.add('active');
        document.getElementById('translateContainer').classList.remove('active');
        document.getElementById('settingsContainer').focus();
    });
});
