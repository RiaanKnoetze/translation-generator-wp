import { showNotification } from './utils.js';

// Function to save settings (API key, selected languages, selected model, and batch size) to the server
export async function saveSettings(apiKey, selectedLanguages, selectedModel, batchSize) {
    try {
        // Send a POST request to save the settings
        const response = await fetch('/save-settings', {
            method: 'POST', // HTTP method
            headers: {
                'Content-Type': 'application/json' // Content type of the request
            },
            body: JSON.stringify({ apiKey, selectedLanguages, selectedModel, batchSize }) // Data to be sent in the request body
        });

        // Parse the JSON response from the server
        const result = await response.json();

        // Check if the request was successful
        if (response.ok) {
            // Show a success notification in the settings notification container
            showNotification(result.message, 'green', 'settings-notification-container');
        } else {
            // Show an error notification if the response was not ok
            showNotification('Error: ' + result.message, 'red', 'settings-notification-container');
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.error('Error saving settings:', error);
        // Show an error notification
        showNotification('Error: ' + error.message, 'red', 'settings-notification-container');
    }
}

// Function to load settings (API key, selected languages, selected model, and batch size) from the server
export async function loadSettings(choicesInstance, modelChoicesInstance) {
    try {
        // Send a GET request to fetch the settings
        const response = await fetch('/get-settings');
        // Parse the JSON response from the server
        const result = await response.json();

        // Check if the request was successful
        if (response.ok) {
            // Update the API key input field with the fetched API key
            document.getElementById('apiKey').value = result.apiKey;
            // Update the Choices.js instance with the selected languages
            choicesInstance.setChoiceByValue(result.selectedLanguages);
            // Update the Choices.js instance with the selected model
            modelChoicesInstance.setChoiceByValue(result.selectedModel);
            // Update the batch size input field
            document.getElementById('batchSize').value = result.batchSize;
            // Store the settings globally or in a variable accessible to the translation process
            window.settings = {
                selectedModel: result.selectedModel,
                batchSize: result.batchSize
            };
        } else {
            // Log an error message if the response was not ok
            console.error('Error fetching settings:', result.message);
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.error('Error fetching settings:', error);
    }
}

// Function to set event listeners for tab navigation
export function setTabListeners() {
    // Get references to the DOM elements for the tabs and containers
    const tabTranslate = document.getElementById('tabTranslate');
    const tabSettings = document.getElementById('tabSettings');
    const translateContainer = document.getElementById('translateContainer');
    const settingsContainer = document.getElementById('settingsContainer');

    // Add click event listener for the Translate tab
    tabTranslate.addEventListener('click', function() {
        // Add active class and styles to the Translate tab
        tabTranslate.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        // Remove active class and styles from the Settings tab
        tabSettings.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        // Show the Translate container and hide the Settings container
        translateContainer.classList.add('active');
        settingsContainer.classList.remove('active');
    });

    // Add click event listener for the Settings tab
    tabSettings.addEventListener('click', function() {
        // Add active class and styles to the Settings tab
        tabSettings.classList.add('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        // Remove active class and styles from the Translate tab
        tabTranslate.classList.remove('active', 'rounded-tl-lg', 'rounded-bl-lg', 'shadow-md', 'bg-gray-800', 'text-white');
        // Show the Settings container and hide the Translate container
        settingsContainer.classList.add('active');
        translateContainer.classList.remove('active');
    });
}
