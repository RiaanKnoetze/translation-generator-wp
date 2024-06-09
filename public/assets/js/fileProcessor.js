import { processContent } from './translator.js';
import { saveTranslatedFile, calculateStringsInFile, resetProgressAndTokens, resetExcludedTerms, addPluginNameToExclusions, showNotification } from './utils.js';

export function initializeFileUpload() {
    const uploadInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const translateButton = document.getElementById('translateBtn');
    const translateNotificationContainer = document.getElementById('translate-notification-container'); // New notification container
    const languagesDisplay = document.getElementById('languagesDisplay');
    const stringsFound = document.getElementById('stringsFound');
    const stringsToTranslate = document.getElementById('stringsToTranslate');
    const gptModelDisplay = document.getElementById('gptModelDisplay');

    let originalFileName = '';

    uploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.pot')) {
            translateButton.disabled = false;
            originalFileName = file.name.replace('.pot', '');
            fileNameDisplay.textContent = file.name;

            // Get selected languages and GPT model
            const selectedLanguages = Array.from(document.getElementById('languageSelect').selectedOptions).map(option => option.text);
            const gptModel = document.getElementById('modelSelect').value;

            languagesDisplay.textContent = selectedLanguages.join(', ');
            gptModelDisplay.textContent = gptModel;

            // Calculate strings found in file
            calculateStringsInFile(file, function(totalStrings) {
                stringsFound.textContent = totalStrings;
                stringsToTranslate.textContent = totalStrings * selectedLanguages.length;
            });

            fileInfoContainer.classList.remove('hidden');
            resetProgressAndTokens();
            resetExcludedTerms();
            addPluginNameToExclusions(originalFileName);
        } else {
            showNotification('Please upload a .POT file.', 'red', translateNotificationContainer);
            translateButton.disabled = true;
            fileNameDisplay.textContent = '';
            fileInfoContainer.classList.add('hidden');
        }
    });
}

export function initializeTranslateButton() {
    const translateButton = document.getElementById('translateBtn');
    translateButton.addEventListener('click', async function() {
        const progressBarsContainer = document.getElementById('progressBarsContainer');
        const uploadInput = document.getElementById('fileUpload');
        const excludedTermsInput = document.getElementById('excludedTerms');
        const languageSelect = document.getElementById('languageSelect'); // Get the selected languages

        // Clear progress bars container
        progressBarsContainer.innerHTML = '<div class="mt-6 border-t border-gray-100 pt-2"><h2 class="text-2xl font-bold text-gray-800">Progress</h2><table class="w-full mt-4"><tbody></tbody></table></div>';
        progressBarsContainer.classList.remove('hidden');

        const tableBody = progressBarsContainer.querySelector('tbody');

        // Get the selected languages
        const selectedLanguages = Array.from(languageSelect.selectedOptions).map(option => ({ code: option.value, name: option.text }));

        // Initialize progress bars
        selectedLanguages.forEach(language => {
            const progressBarId = `progressBar-${language.code}`;
            const progressTimeId = `progressTime-${language.code}`;
            const progressRow = document.createElement('tr');
            progressRow.innerHTML = `
                <td class="px-4 py-2 text-gray-900 text-sm font-medium leading-6 w-1/3">${language.name}</td>
                <td class="px-4 py-2 w-full">
                    <div id="progressContainer-${language.code}" class="w-full bg-white border border-gray-300 rounded-lg h-8 relative shadow-sm">
                        <div id="${progressBarId}" class="bg-green-500 h-8 rounded-lg" style="width: 0%"></div>
                        <div id="${progressTimeId}" class="absolute inset-0 flex items-center justify-center text-xs text-gray-800">0s</div>
                    </div>
                </td>
            `;
            tableBody.appendChild(progressRow);
        });

        const file = uploadInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            const content = e.target.result;
            const excludedTerms = excludedTermsInput.value.split(',').map(term => term.trim());
            const startTime = new Date();
            const originalFileName = file.name.replace('.pot', '');
            const batchSize = parseInt(window.settings.batchSize, 10) || 10;

            for (const language of selectedLanguages) {
                const progressBarId = `progressBar-${language.code}`;
                const progressTimeId = `progressTime-${language.code}`;
                const progressContainerId = `progressContainer-${language.code}`;
                const { translatedContent } = await processContent(content, excludedTerms, originalFileName, startTime, language.code, batchSize, progressBarId);
                saveTranslatedFile(translatedContent, originalFileName, language.code);

                document.getElementById(progressTimeId).style.display = 'none';
                document.getElementById(progressContainerId).classList.remove('border', 'border-gray-300');
            }
        };
        reader.readAsText(file);
    });
}

export function initializeLanguageSelect() {
    const languageSelect = document.getElementById('languageSelect');
    return new Choices(languageSelect, {
        placeholderValue: 'Choose Language',
        searchPlaceholderValue: 'Type to search',
        shouldSort: true,
        removeItemButton: true,
        duplicateItemsAllowed: false,
        searchChoices: false,
        shouldSortItems: true,
        searchEnabled: true,
        searchChoices: true,
        searchFloor: 1,
        searchResultLimit: 4,
        searchFields: ['label', 'value'],
    });
}
