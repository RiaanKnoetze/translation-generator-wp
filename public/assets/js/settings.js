// settings.js

import { showNotification } from './utils.js';

export async function saveSettings(apiKey, selectedLanguages, selectedModel, batchSize, showAdvancedSettings, autoGenerateMoFiles) {
    try {
        const response = await fetch('/save-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey, selectedLanguages, selectedModel, batchSize, showAdvancedSettings, autoGenerateMoFiles })
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

export async function loadSettings(choicesInstance, modelChoicesInstance, toggleAdvancedSettings, toggleAutoGenerateMoFiles) {
    try {
        const response = await fetch('/get-settings');
        const result = await response.json();

        if (response.ok) {
            document.getElementById('apiKey').value = result.apiKey;
            choicesInstance.setChoiceByValue(result.selectedLanguages);
            modelChoicesInstance.setChoiceByValue(result.selectedModel);
            document.getElementById('batchSize').value = result.batchSize;

            if (toggleAdvancedSettings && toggleAutoGenerateMoFiles) {
                toggleButton(toggleAdvancedSettings, result.showAdvancedSettings);
                toggleButton(toggleAutoGenerateMoFiles, result.autoGenerateMoFiles);
            }

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

function toggleButton(button, isChecked) {
    const buttonSpan = button.querySelector('span');

    if (isChecked) {
        button.classList.remove('bg-gray-200');
        button.classList.add('bg-blue-600');
        button.setAttribute('aria-checked', 'true');
        buttonSpan.classList.remove('translate-x-0');
        buttonSpan.classList.add('translate-x-5');

        buttonSpan.innerHTML = `
            <span class="opacity-0 duration-100 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" aria-hidden="true">
                <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                    <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </span>
            <span class="opacity-100 duration-200 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" aria-hidden="true">
                <svg class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M3 6l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </span>`;
    } else {
        button.classList.remove('bg-blue-600');
        button.classList.add('bg-gray-200');
        button.setAttribute('aria-checked', 'false');
        buttonSpan.classList.remove('translate-x-5');
        buttonSpan.classList.add('translate-x-0');

        buttonSpan.innerHTML = `
            <span class="opacity-100 duration-200 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" aria-hidden="true">
                <svg class="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                    <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </span>
            <span class="opacity-0 duration-100 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" aria-hidden="true">
                <svg class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M3 6l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </span>`;
    }
}

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
