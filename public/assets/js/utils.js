/**
 * Format the plugin name by capitalizing the first letter of each word.
 * @param {string} name - The original plugin name.
 * @returns {string} - The formatted plugin name.
 */
export function formatPluginName(name) {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Apply fixes to the translated text.
 * @param {string} original - The original text.
 * @param {string} translation - The translated text.
 * @param {Map} exclusionMap - Map of terms to exclude from translation.
 * @returns {string} - The fixed translation.
 */
export function applyFixes(original, translation, exclusionMap) {
    if (!original || !translation) return translation;

    // Save placeholders wrapped by {{ }}
    const placeholders = [];
    const placeholderRegex = /{{\s*[\w\s]+\s*}}/g;
    let match;
    while ((match = placeholderRegex.exec(original)) !== null) {
        placeholders.push(match[0]);
    }

    // Replace specific quotation marks with standard double quotes
    translation = translation.replace(/«/g, '"').replace(/»/g, '"');

    // Ensure placeholders are correctly included in the translation
    const originalPlaceholders = original.match(/%[0-9]+\$[a-zA-Z]/g) || [];
    originalPlaceholders.forEach(placeholder => {
        if (!translation.includes(placeholder)) {
            translation = placeholder + translation.replace(new RegExp(placeholder.replace('$', '\\$'), 'g'), '');
        }
    });

    // Correct spacing around punctuation
    translation = translation.replace(/\s+([.,?!])/g, '$1');

    // Add space at the beginning if the original starts with a space
    if (/^\s/.test(original)) {
        translation = ` ${translation}`;
    }
    // Add space at the end if the original ends with a space
    if (/\s$/.test(original)) {
        translation = `${translation} `;
    }

    // Restore original terms from the exclusion map
    exclusionMap.forEach((originalTerm, normalizedTerm) => {
        const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'gi');
        translation = translation.replace(regex, match => originalTerm);
    });

    // Restore placeholders wrapped by {{ }}
    placeholders.forEach(placeholder => {
        const regex = new RegExp(`{{\\s*${placeholder.slice(2, -2).trim()}\\s*}}`, 'gi');
        translation = translation.replace(regex, placeholder);
    });

    // Replace non-breaking spaces with regular spaces
    translation = translation.replace(/[\u00A0]/g, ' ');

    // Ensure the translation ends with the same punctuation as the original
    const endingPunctuation = getEndingPunctuation(original);
    if (endingPunctuation && !translation.trim().endsWith(endingPunctuation)) {
        translation = `${translation.trim()}${endingPunctuation}`;
    }

    // Add original ending punctuation if present
    if (original.endsWith(' ')) {
        translation = `${translation} `;
    }

    // Fix for missing placeholders closing bracket
    const missingPlaceholders = original.match(/{[^}]*$/g) || [];
    missingPlaceholders.forEach(placeholder => {
        if (!translation.includes(placeholder)) {
            translation = translation.replace(placeholder.replace('{', '\\{'), placeholder);
        }
    });

    // Ensure the translation starts with the same case as the original
    if (original.charAt(0).toLowerCase() === original.charAt(0) && translation.charAt(0).toUpperCase() === translation.charAt(0)) {
        translation = translation.charAt(0).toLowerCase() + translation.slice(1);
    }

    // Escape double quotes in the translation, except inside certain HTML attributes
    translation = escapeQuotesInHTML(translation);

    return translation;
}


/**
 * Get the ending punctuation of a string.
 * @param {string} text - The input text.
 * @returns {string} - The ending punctuation.
 */
function getEndingPunctuation(text) {
    const punctuation = ['.', ',', ':', ';', '!', ')', ']', "'", '"', '>', '»', '?', '...', '…'];
    const specialPunctuation = ['&raquo;'];

    const trimmedText = text.trim();
    const lastChar = trimmedText.slice(-1);

    if (punctuation.includes(lastChar)) {
        return lastChar;
    }

    for (let mark of specialPunctuation) {
        if (trimmedText.endsWith(mark)) {
            return mark;
        }
    }

    return '';
}

/**
 * Escape quotes outside HTML tags and attributes.
 * @param {string} text - The input text.
 * @returns {string} - The text with escaped quotes.
 */
function escapeQuotesInHTML(text) {
    return text.replace(/(<\/?[\w\s="/.':;#-\/\?]+>)/g, (match) => {
        if (match.startsWith('<') && match.endsWith('>')) {
            return match;
        }
        return match.replace(/"/g, '\\"');
    });
}

/**
 * Get the token count of a text.
 * @param {string} text - The input text.
 * @returns {number} - The token count.
 */
export function getTokenCount(text) {
    return text.split(/\s+/).length;
}

/**
 * Update the progress of the translation process.
 * @param {number} translated - The number of translated strings.
 * @param {number} total - The total number of strings to translate.
 * @param {Date} startTime - The start time of the translation process.
 * @param {string} progressBarId - The ID of the progress bar element.
 */
export function updateProgress(translated, total, startTime, progressBarId) {
    const progressBar = document.getElementById(progressBarId);
    const estimatedTime = progressBar.nextElementSibling;

    const percentage = (translated / total) * 100;
    progressBar.style.width = `${percentage}%`;

    if (translated > 0) {
        const elapsedTime = (new Date() - startTime) / 1000; // in seconds
        const estimatedTotalTime = (elapsedTime / translated) * total;
        const estimatedTimeRemaining = estimatedTotalTime - elapsedTime;
        estimatedTime.textContent = `${Math.round(estimatedTimeRemaining)}s`;
        estimatedTime.classList.toggle('text-gray-800', percentage <= 50);
        estimatedTime.classList.toggle('text-white', percentage > 50);
    }
}

/**
 * Update the token usage display.
 * @param {number} inputTokens - The number of input tokens used.
 * @param {number} outputTokens - The number of output tokens used.
 */
export function updateTokensUsed(inputTokens, outputTokens) {
    const tokensUsed = document.getElementById('tokensUsed');
    const inputCostPerThousandTokens = 0.005;
    const outputCostPerThousandTokens = 0.015;

    const inputCost = (inputTokens / 1000) * inputCostPerThousandTokens;
    const outputCost = (outputTokens / 1000) * outputCostPerThousandTokens;
    const totalCost = inputCost + outputCost;
    const combinedTokens = inputTokens + outputTokens;

    console.log(`Combined tokens: ${combinedTokens}, Cost: $${totalCost.toFixed(5)}`);

    tokensUsed.textContent = `Tokens used: ${combinedTokens} ($${totalCost.toFixed(5)})`;
}

/**
 * Reset the progress and token usage display.
 */
export function resetProgressAndTokens() {
    const stringsTranslated = document.getElementById('stringsTranslated');
    const tokensUsed = document.getElementById('tokensUsed');

    stringsTranslated.textContent = `Strings translated: 0/0`;
    tokensUsed.textContent = `Tokens used: 0 ($0.00)`;
}

/**
 * Reset the excluded terms input field.
 */
export function resetExcludedTerms() {
    const excludedTermsInput = document.getElementById('excludedTerms');
    excludedTermsInput.value = '';
}

/**
 * Add the plugin name to the excluded terms.
 * @param {string} fileName - The file name of the plugin.
 */
export function addPluginNameToExclusions(fileName) {
    const excludedTermsInput = document.getElementById('excludedTerms');
    const pluginName = formatPluginName(fileName.replace(/-[a-z]{2}_[A-Z]{2}$/, ''));
    const existingTerms = excludedTermsInput.value.split(',').map(term => term.trim()).filter(term => term !== '');
    if (!existingTerms.includes(pluginName)) {
        existingTerms.push(pluginName);
    }
    excludedTermsInput.value = existingTerms.join(', ');
}

/**
 * Calculate the number of strings in a .POT file.
 * @param {File} file - The .POT file.
 * @param {function} callback - Callback function to handle the total string count.
 */
export function calculateStringsInFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const totalStrings = content.split('\n').filter(line => line.startsWith('msgid')).length;
        callback(totalStrings);
    };
    reader.readAsText(file);
}

/**
 * Check if a term is excluded from translation.
 * @param {string} term - The term to check.
 * @param {Array<string>} normalizedExclusions - Array of normalized exclusions.
 * @returns {boolean} - True if the term is excluded, false otherwise.
 */
export function isExcludedTerm(term, normalizedExclusions) {
    return normalizedExclusions.includes(term.toLowerCase());
}

/**
 * Save the translated file.
 * @param {string} translatedContent - The translated content.
 * @param {string} originalFileName - The original file name.
 * @param {string} selectedLanguage - The selected language code.
 */
export function saveTranslatedFile(translatedContent, originalFileName, selectedLanguage) {
    const blob = new Blob([translatedContent], { type: 'text/plain' });
    const newFileName = `${originalFileName}-${selectedLanguage}.po`;
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = newFileName;
    link.click();
}

/**
 * Show a notification message.
 * @param {string} message - The notification message.
 * @param {string} [type='green'] - The notification type (color).
 * @param {string} [containerId='translate-notification-container'] - The ID of the container to show the notification in.
 */
export function showNotification(message, type = 'green', containerId = 'translate-notification-container') {
    let notificationContainer = document.getElementById(containerId);

    if (!notificationContainer) {
        console.warn(`Notification container with ID ${containerId} not found. Falling back to default container.`);
        notificationContainer = document.getElementById('translate-notification-container');
    }

    if (!notificationContainer) {
        console.error('No valid notification container found.');
        return;
    }

    const notificationId = 'notification-' + Date.now();

    notificationContainer.innerHTML = `
        <div id="${notificationId}" class="rounded-md bg-${type}-50 p-4" role="alert" aria-live="assertive" aria-atomic="true" tabindex="-1" style="outline: none;">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-${type}-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-${type}-800">${message}</p>
            </div>
            <div class="ml-auto pl-3">
              <div class="-mx-1.5 -my-1.5">
                <button type="button" id="dismissBtn" class="inline-flex rounded-md bg-${type}-50 p-1.5 text-${type}-500 hover:bg-${type}-100 focus:outline-none focus:ring-2 focus:ring-${type}-600 focus:ring-offset-2 focus:ring-offset-${type}-50" aria-label="Dismiss notification">
                  <span class="sr-only">Dismiss</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
    `;

    const dismissBtn = document.getElementById('dismissBtn');
    const notification = document.getElementById(notificationId);

    dismissBtn.addEventListener('click', () => {
        notificationContainer.innerHTML = '';
    });

    notification.focus();

    const tabTranslate = document.getElementById('tabTranslate');
    tabTranslate.addEventListener('click', () => {
        notificationContainer.innerHTML = '';
    });
}
