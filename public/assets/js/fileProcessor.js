import { processContent, initializeFileCheckIcon } from './translator.js';
import { saveTranslatedFile, calculateStringsInFile, resetProgressAndTokens, resetExcludedTerms, addPluginNameToExclusions } from './utils.js';

// Function to initialize the file upload functionality
export function initializeFileUpload() {
    // Get references to the DOM elements related to file upload
    const uploadInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileName');
    const fileDisplayContainer = document.getElementById('fileDisplayContainer');
    const translateButton = document.getElementById('translateBtn');
    const fileCheckIcon = document.getElementById('fileCheckIcon');
    let originalFileName = '';

    // Add event listener for file input change
    uploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0]; // Get the selected file
        if (file && file.name.endsWith('.pot')) { // Check if the file is a .POT file
            translateButton.disabled = false; // Enable the translate button
            originalFileName = file.name.replace('.pot', ''); // Get the original file name without the extension
            fileNameDisplay.textContent = file.name; // Display the file name
            fileDisplayContainer.classList.remove('hidden'); // Show the file display container
            fileCheckIcon.classList.remove('hidden'); // Show the file check icon
            fileCheckIcon.className = 'fa-solid fa-check file-check-icon text-gray-800'; // Set the icon to a checkmark
            resetProgressAndTokens(); // Reset progress and tokens
            resetExcludedTerms(); // Reset excluded terms
            addPluginNameToExclusions(originalFileName); // Add the plugin name to exclusions
            calculateStringsInFile(file); // Calculate the number of strings in the file
        } else {
            alert('Please upload a .POT file.'); // Alert if the file is not a .POT file
            translateButton.disabled = true; // Disable the translate button
            fileNameDisplay.textContent = ''; // Clear the file name display
            fileDisplayContainer.classList.add('hidden'); // Hide the file display container
            fileCheckIcon.classList.add('hidden'); // Hide the file check icon
        }
    });
}

// Function to initialize the translate button functionality
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
        fileCheckIcon.classList.add('hidden'); // Hide the check icon
        fileCheckIcon.className = 'fa-solid fa-spinner file-check-icon text-gray-800 fa-spin'; // Set the icon to a spinner
        fileCheckIcon.classList.remove('hidden'); // Show the spinner icon
        progressContainer.classList.remove('hidden'); // Show the progress container
        progressContainer.classList.remove('hide'); // Ensure progress container is not hidden

        const file = uploadInput.files[0]; // Get the uploaded file
        const reader = new FileReader();
        reader.onload = async function(e) {
            const content = e.target.result; // Get the file content
            const excludedTerms = excludedTermsInput.value.split(',').map(term => term.trim()); // Get excluded terms
            const startTime = new Date(); // Start time for progress tracking
            const originalFileName = file.name.replace('.pot', ''); // Get the original file name without the extension
            const translatedContent = await processContent(content, excludedTerms, originalFileName, startTime); // Process the content for translation
            saveTranslatedFile(translatedContent, originalFileName); // Save the translated file

            // Update UI after translation is complete
            setTimeout(() => {
                progressContainer.classList.add('hide'); // Hide the progress container
                setTimeout(() => progressContainer.classList.add('hidden'), 1000); // Ensure it stays hidden
                fileCheckIcon.classList.add('hidden'); // Hide the spinner icon
                fileCheckIcon.className = 'fa-solid fa-download file-check-icon text-gray-800'; // Set the icon to a download icon
                fileCheckIcon.classList.remove('hidden'); // Show the download icon
            }, 2000);
        };
        reader.readAsText(file); // Read the file as text
    });
}

// Function to initialize the language select dropdown using Choices.js
export function initializeLanguageSelect() {
    const languageSelect = document.getElementById('languageSelect');
    return new Choices(languageSelect, {
        placeholderValue: 'Select a language', // Placeholder text
        searchPlaceholderValue: 'Type to search', // Placeholder text for the search input
        shouldSort: true, // Sort the options
        removeItemButton: true, // Enable removing selected items
    });
}
