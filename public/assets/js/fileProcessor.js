import { processContent } from './translator.js';
import { saveTranslatedFile, calculateStringsInFile, resetProgressAndTokens, resetExcludedTerms, addPluginNameToExclusions, showNotification } from './utils.js';

let uploadedFile = null;

/**
 * Initialize the file upload functionality.
 */
export function initializeFileUpload() {
    const uploadInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const translateButton = document.getElementById('translateBtn');
    const translateNotificationContainer = document.getElementById('translate-notification-container');
    const languagesDisplay = document.getElementById('languagesDisplay');
    const stringsFound = document.getElementById('stringsFound');
    const stringsToTranslate = document.getElementById('stringsToTranslate');
    const gptModelDisplay = document.getElementById('gptModelDisplay');
    const progressBarsContainer = document.getElementById('progressBarsContainer');

    let originalFileName = '';
    let totalStrings = 0;

    uploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        handleFile(file);
    });

    /**
     * Reset the UI elements related to file upload.
     */
    function resetUI() {
        fileNameDisplay.textContent = '';
        languagesDisplay.textContent = '';
        stringsFound.textContent = '';
        stringsToTranslate.textContent = '';
        gptModelDisplay.textContent = '';
        progressBarsContainer.innerHTML = '';
        fileInfoContainer.classList.add('hidden');
    }

    /**
     * Update translation details in the UI.
     */
    function updateTranslationDetails() {
        const selectedLanguages = Array.from(document.getElementById('languageSelect').selectedOptions).map(option => option.text);
        const gptModel = document.getElementById('modelSelect').value;

        languagesDisplay.textContent = selectedLanguages.join(', ');
        gptModelDisplay.textContent = gptModel;
        stringsToTranslate.textContent = totalStrings * selectedLanguages.length;
    }

    document.getElementById('saveBtn').addEventListener('click', updateTranslationDetails);
}

/**
 * Initialize the translate button functionality.
 */
export function initializeTranslateButton() {
    const translateButton = document.getElementById('translateBtn');
    translateButton.addEventListener('click', function() {
        const progressBarsContainer = document.getElementById('progressBarsContainer');
        const languageSelect = document.getElementById('languageSelect');

        progressBarsContainer.innerHTML = '<div class="mt-6 border-t border-gray-100 pt-2"><h2 class="text-2xl font-bold text-gray-800">Progress</h2><table class="w-full mt-4"><tbody></tbody></table></div>';
        progressBarsContainer.classList.remove('hidden');

        const tableBody = progressBarsContainer.querySelector('tbody');
        const selectedLanguages = Array.from(languageSelect.selectedOptions).map(option => ({ code: option.value, name: option.text }));

        selectedLanguages.forEach(language => {
            const progressBarId = `progressBar-${language.code}`;
            const progressTimeId = `progressTime-${language.code}`;
            const progressRow = document.createElement('tr');
            progressRow.innerHTML = `
                <td class="px-4 py-2 text-gray-900 text-sm font-medium leading-6 w-1/3">${language.name}</td>
                <td class="px-4 py-2 w-full">
                    <div class="w-full bg-gray-200 rounded-lg h-8 relative">
                        <div id="${progressBarId}" class="bg-blue-500 h-8 rounded-lg" style="width: 0%"></div>
                        <div id="${progressTimeId}" class="absolute inset-0 flex items-center justify-center text-xs text-gray-800">
                            <i class="fas fa-spinner fa-spin text-gray-800"></i>
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(progressRow);
        });

        startTranslation(selectedLanguages);
    });
}

/**
 * Start the translation process.
 * 
 * @param {Array<Object>} selectedLanguages - The selected languages for translation.
 */
function startTranslation(selectedLanguages) {
    if (!uploadedFile) {
        showNotification('No file uploaded. Please upload a .POT file.', 'red', 'translate-notification-container');
        return;
    }

    if (!Array.isArray(selectedLanguages)) {
        showNotification('No languages selected for translation.', 'red', 'translate-notification-container');
        return;
    }

    const excludedTermsInput = document.getElementById('excludedTerms');
    const reader = new FileReader();

    reader.onload = async function(e) {
        const content = e.target.result;
        const excludedTerms = excludedTermsInput.value.split(',').map(term => term.trim());
        const startTime = new Date();
        const originalFileName = uploadedFile.name.replace('.pot', '');

        const batchSize = parseInt(window.settings.batchSize, 10) || 10;

        for (const language of selectedLanguages) {
            const progressBarId = `progressBar-${language.code}`;
            const progressTimeId = `progressTime-${language.code}`;

            // Remove the spinner when translation starts
            document.getElementById(progressTimeId).innerHTML = '0s';

            const { translatedContent } = await processContent(content, excludedTerms, originalFileName, startTime, language.code, batchSize, progressBarId);
            saveTranslatedFile(translatedContent, originalFileName, language.code);

            // Show checkmark on completion
            document.getElementById(progressBarId).style.width = '100%';
            document.getElementById(progressTimeId).innerHTML = '<i class="fas fa-check text-white"></i>';
        }
    };

    reader.readAsText(uploadedFile);
}

/**
 * Initialize the language select dropdown.
 * 
 * @returns {Choices} - The initialized Choices instance.
 */
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

/**
 * Initialize the drag and drop functionality for file upload.
 */
export function initializeDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileUploadInput = document.getElementById('fileUpload');

    dropZone.addEventListener('click', () => {
        fileUploadInput.click();
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('bg-gray-100');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('bg-gray-100');
    });

    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('bg-gray-100');

        if (event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            handleFile(file);
        }
    });

    fileUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        handleFile(file);
    });
}

/**
 * Handle the uploaded file.
 * 
 * @param {File} file - The uploaded file.
 */
function handleFile(file) {
    const translateButton = document.getElementById('translateBtn');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const translateNotificationContainer = document.getElementById('translate-notification-container');
    const languagesDisplay = document.getElementById('languagesDisplay');
    const stringsFound = document.getElementById('stringsFound');
    const stringsToTranslate = document.getElementById('stringsToTranslate');
    const gptModelDisplay = document.getElementById('gptModelDisplay');
    const progressBarsContainer = document.getElementById('progressBarsContainer');

    let originalFileName = '';
    let totalStrings = 0;

    if (file && file.name.endsWith('.pot')) {
        resetUI();
        translateButton.disabled = false;
        originalFileName = file.name.replace('.pot', '');
        fileNameDisplay.textContent = file.name;
        uploadedFile = file;

        updateTranslationDetails();

        calculateStringsInFile(file, function(total) {
            totalStrings = total;
            stringsFound.textContent = totalStrings;
            stringsToTranslate.textContent = totalStrings * Array.from(document.getElementById('languageSelect').selectedOptions).length;
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

    /**
     * Reset the UI elements related to file upload.
     */
    function resetUI() {
        fileNameDisplay.textContent = '';
        languagesDisplay.textContent = '';
        stringsFound.textContent = '';
        stringsToTranslate.textContent = '';
        gptModelDisplay.textContent = '';
        progressBarsContainer.innerHTML = '';
        fileInfoContainer.classList.add('hidden');
    }

    /**
     * Update translation details in the UI.
     */
    function updateTranslationDetails() {
        const selectedLanguages = Array.from(document.getElementById('languageSelect').selectedOptions).map(option => option.text);
        const gptModel = document.getElementById('modelSelect').value;

        languagesDisplay.textContent = selectedLanguages.join(', ');
        gptModelDisplay.textContent = gptModel;
        stringsToTranslate.textContent = totalStrings * selectedLanguages.length;
    }

    document.getElementById('saveBtn').addEventListener('click', updateTranslationDetails);
}
