import { processContent } from './translator.js';
import { saveTranslatedFile, calculateStringsInFile, resetProgressAndTokens, resetExcludedTerms, addPluginNameToExclusions, updateProgress } from './utils.js';

export function initializeFileUpload() {
    const uploadInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileName');
    const fileDisplayContainer = document.getElementById('fileDisplayContainer');
    const translateButton = document.getElementById('translateBtn');
    const fileCheckIcon = document.getElementById('fileCheckIcon');
    let originalFileName = '';

    uploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.pot')) {
            translateButton.disabled = false;
            originalFileName = file.name.replace('.pot', '');
            fileNameDisplay.textContent = file.name;
            fileDisplayContainer.classList.remove('hidden');
            fileCheckIcon.classList.remove('hidden');
            fileCheckIcon.className = 'fa-solid fa-check file-check-icon text-gray-800'; // Show the check icon
            resetProgressAndTokens();
            resetExcludedTerms();
            addPluginNameToExclusions(originalFileName);
            calculateStringsInFile(file);
        } else {
            alert('Please upload a .POT file.');
            translateButton.disabled = true;
            fileNameDisplay.textContent = '';
            fileDisplayContainer.classList.add('hidden');
            fileCheckIcon.classList.add('hidden'); // Hide the check icon
        }
    });
}

export function initializeTranslateButton() {
    const translateButton = document.getElementById('translateBtn');
    translateButton.addEventListener('click', async function() {
        const fileCheckIcon = document.getElementById('fileCheckIcon');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const uploadInput = document.getElementById('fileUpload');
        const excludedTermsInput = document.getElementById('excludedTerms');

        // Reset progress bar
        progressBar.style.width = '0%';

        // Update check icon and progress bar visibility
        fileCheckIcon.classList.add('hidden');
        fileCheckIcon.className = 'fa-solid fa-spinner file-check-icon text-gray-800 fa-spin';
        fileCheckIcon.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        progressContainer.classList.remove('hide');

        const file = uploadInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            const content = e.target.result;
            const excludedTerms = excludedTermsInput.value.split(',').map(term => term.trim());
            const startTime = new Date();
            const originalFileName = file.name.replace('.pot', '');
            const translatedContent = await processContent(content, excludedTerms, originalFileName, startTime);
            saveTranslatedFile(translatedContent, originalFileName);
            setTimeout(() => {
                progressContainer.classList.add('hide');
                setTimeout(() => progressContainer.classList.add('hidden'), 1000);
                fileCheckIcon.classList.add('hidden');
                fileCheckIcon.className = 'fa-solid fa-download file-check-icon text-gray-800';
                fileCheckIcon.classList.remove('hidden');
            }, 2000);
        };
        reader.readAsText(file);
    });
}