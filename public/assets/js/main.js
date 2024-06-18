import { initializeFileUpload, initializeTranslateButton, initializeLanguageSelect, initializeDragAndDrop } from './fileProcessor.js';
import { saveSettings, loadSettings, setTabListeners } from './settings.js';

let choicesInstance;
let modelChoicesInstance;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    const saveBtn = document.getElementById('saveBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const languageSelect = document.getElementById('languageSelect');
    const modelSelect = document.getElementById('modelSelect');
    const batchSizeInput = document.getElementById('batchSize');
    const toggleAdvancedSettings = document.getElementById('toggleAdvancedSettings');
    const toggleAutoGenerateMoFiles = document.getElementById('toggleAutoGenerateMoFiles');

    initializeFileUpload();
    initializeTranslateButton(); // Ensure this is called only once

    choicesInstance = initializeLanguageSelect();
    modelChoicesInstance = new Choices(modelSelect, { removeItemButton: true });

    loadSettings(choicesInstance, modelChoicesInstance, toggleAdvancedSettings, toggleAutoGenerateMoFiles).then(() => {
        sendLanguageMapping();
    });

    setTabListeners();
    initializeDragAndDrop();

    function getLanguageMapping() {
        const options = languageSelect.options;
        const languageMapping = {};
        for (let i = 0; i < options.length; i++) {
            languageMapping[options[i].value] = options[i].text;
        }
        return languageMapping;
    }

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

    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value;
        const selectedLanguages = Array.from(languageSelect.selectedOptions).map(option => option.value);
        const selectedModel = modelSelect.value;
        const batchSize = batchSizeInput.value;
        const showAdvancedSettings = toggleAdvancedSettings.getAttribute('aria-checked') === 'true';
        const autoGenerateMoFiles = toggleAutoGenerateMoFiles.getAttribute('aria-checked') === 'true';
        saveSettings(apiKey, selectedLanguages, selectedModel, batchSize, showAdvancedSettings, autoGenerateMoFiles).then(() => {
            sendLanguageMapping();
        });
    });

    toggleAdvancedSettings.addEventListener('click', function() {
        const isChecked = toggleAdvancedSettings.getAttribute('aria-checked') === 'true';
        toggleButton(toggleAdvancedSettings, !isChecked);
    });

    toggleAutoGenerateMoFiles.addEventListener('click', function() {
        const isChecked = toggleAutoGenerateMoFiles.getAttribute('aria-checked') === 'true';
        toggleButton(toggleAutoGenerateMoFiles, !isChecked);
    });

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
});
