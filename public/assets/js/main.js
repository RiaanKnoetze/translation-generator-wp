import { initializeFileUpload, initializeTranslateButton } from './fileProcessor.js';
import { initializeFileCheckIcon } from './translator.js';

// Initialize event listeners on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeTranslateButton();
    initializeFileCheckIcon();
});
