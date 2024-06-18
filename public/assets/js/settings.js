import { showNotification } from './utils.js';

/**
 * Save settings (API key, selected languages, selected model, and batch size) to the server.
 * @param {string} apiKey - The OpenAI API key.
 * @param {Array<string>} selectedLanguages - Array of selected language codes.
 * @param {string} selectedModel - The selected GPT model.
 * @param {number} batchSize - The batch size for translations.
 */
export async function saveSettings(apiKey, selectedLanguages, selectedModel, batchSize) {
    try {
        const response = await fetch('/save-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey, selectedLanguages, selectedModel, batchSize })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message, 'green', 'settings-notification-container');
        } else {
            showNotification('Error: ' + result.message, 'red', 'settings-notification-container');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error: ' + error.message, 'red', 'settings-notification-container');
    }
}

/**
 * Load settings (API key, selected languages, selected model, and batch size) from the server.
 * @param {Object} choicesInstance - Choices.js instance for language selection.
 * @param {Object} modelChoicesInstance - Choices.js instance for model selection.
 */
export async function loadSettings(choicesInstance, modelChoicesInstance) {
    try {
        const response = await fetch('/get-settings');
        const result = await response.json();

        if (response.ok) {
            document.getElementById('apiKey').value = result.apiKey;
            choicesInstance.setChoiceByValue(result.selectedLanguages);
            modelChoicesInstance.setChoiceByValue(result.selectedModel);
            document.getElementById('batchSize').value = result.batchSize;

            window.settings = {
                selectedModel: result.selectedModel,
                batchSize: result.batchSize
            };
        } else {
            console.error('Error fetching settings:', result.message);
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

/**
 * Set event listeners for tab navigation.
 */
export function setTabListeners() {
    const tabTranslate = document.getElementById('tabTranslate');
    const tabSettings = document.getElementById('tabSettings');
    const translateContainer = document.getElementById('translateContainer');
    const settingsContainer = document.getElementById('settingsContainer');

    tabTranslate.addEventListener('click', function() {
        tabTranslate.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabSettings.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        translateContainer.classList.add('active');
        settingsContainer.classList.remove('active');
    });

    tabSettings.addEventListener('click', function() {
        tabSettings.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        tabTranslate.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        settingsContainer.classList.add('active');
        translateContainer.classList.remove('active');
    });
}
