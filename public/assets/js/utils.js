export function formatPluginName(name) {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function applyFixes(original, translation, exclusionMap) {
    if (!original || !translation) return translation;

    translation = translation.replace(/«/g, '"').replace(/»/g, '"');

    const placeholders = original.match(/%[0-9]+\$[a-zA-Z]/g) || [];
    placeholders.forEach(placeholder => {
        if (!translation.includes(placeholder)) {
            translation = placeholder + translation.replace(new RegExp(placeholder.replace('$', '\\$'), 'g'), '');
        }
    });

    translation = translation.replace(/\s+([.,?!])/g, '$1');

    if (/^\s/.test(original)) {
        translation = ` ${translation}`;
    }
    if (/\s$/.test(original)) {
        translation = `${translation} `;
    }

    exclusionMap.forEach((originalTerm, normalizedTerm) => {
        const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'gi');
        translation = translation.replace(regex, match => originalTerm);
    });

    translation = translation.replace(/[\u00A0]/g, ' ');

    translation = translation.replace(/"/g, '\\"');

    return translation;
}

export function getTokenCount(text) {
    return text.split(/\s+/).length;
}

export function updateProgress(translated, total, startTime) {
    const progressBar = document.getElementById('progressBar');
    const stringsTranslated = document.getElementById('stringsTranslated');
    const estimatedTime = document.getElementById('estimatedTime');

    const percentage = (translated / total) * 100;
    progressBar.style.width = `${percentage}%`;
    stringsTranslated.textContent = `Strings translated: ${translated}/${total}`;
    if (translated > 0) {
        const elapsedTime = (new Date() - startTime) / 1000; // in seconds
        const estimatedTotalTime = (elapsedTime / translated) * total;
        const estimatedTimeRemaining = estimatedTotalTime - elapsedTime;
        estimatedTime.textContent = `${Math.round(estimatedTimeRemaining)}s`;
        estimatedTime.classList.toggle('text-gray-800', percentage <= 50);
        estimatedTime.classList.toggle('text-white', percentage > 50);
    }
}

export function updateTokensUsed(inputTokens, outputTokens) {
    const tokensUsed = document.getElementById('tokensUsed');
    const inputCostPerMillionTokens = 5.00;
    const outputCostPerMillionTokens = 15.00;

    const inputCost = (inputTokens / 1000000) * inputCostPerMillionTokens;
    const outputCost = (outputTokens / 1000000) * outputCostPerMillionTokens;
    const totalCost = inputCost + outputCost;
    tokensUsed.textContent = `Tokens used: ${inputTokens + outputTokens} ($${totalCost.toFixed(2)})`;
    console.log(`Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Cost: $${totalCost.toFixed(2)}`);
}

export function resetProgressAndTokens() {
    const stringsTranslated = document.getElementById('stringsTranslated');
    const tokensUsed = document.getElementById('tokensUsed');

    stringsTranslated.textContent = `Strings translated: 0/0`;
    tokensUsed.textContent = `Tokens used: 0 ($0.00)`;
}

export function resetExcludedTerms() {
    const excludedTermsInput = document.getElementById('excludedTerms');
    excludedTermsInput.value = '';
}

export function addPluginNameToExclusions(fileName) {
    const excludedTermsInput = document.getElementById('excludedTerms');
    const pluginName = formatPluginName(fileName.replace('-fr_FR', ''));
    const existingTerms = excludedTermsInput.value.split(',').map(term => term.trim()).filter(term => term !== '');
    if (!existingTerms.includes(pluginName)) {
        existingTerms.push(pluginName);
    }
    excludedTermsInput.value = existingTerms.join(', ');
}

export function calculateStringsInFile(file) {
    const reader = new FileReader();
    const stringsTranslated = document.getElementById('stringsTranslated');
    reader.onload = function(e) {
        const content = e.target.result;
        const totalStrings = content.split('\n').filter(line => line.startsWith('msgid')).length;
        stringsTranslated.textContent = `Strings translated: 0/${totalStrings}`;
    };
    reader.readAsText(file);
}

export function isExcludedTerm(term, normalizedExclusions) {
    return normalizedExclusions.includes(term.toLowerCase());
}

export function saveTranslatedFile(translatedContent, originalFileName, selectedLanguage) {
    const blob = new Blob([translatedContent], { type: 'text/plain' });
    const newFileName = `${originalFileName}-${selectedLanguage}.po`;
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = newFileName;
    link.click();
}

export function showNotification(message, type = 'green') {
    const notificationContainer = document.getElementById('notification-container');
    notificationContainer.innerHTML = `
        <div class="rounded-md bg-${type}-50 p-4">
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
                <button type="button" id="dismissBtn" class="inline-flex rounded-md bg-${type}-50 p-1.5 text-${type}-500 hover:bg-${type}-100 focus:outline-none focus:ring-2 focus:ring-${type}-600 focus:ring-offset-2 focus:ring-offset-${type}-50">
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

    document.getElementById('dismissBtn').addEventListener('click', () => {
        notificationContainer.innerHTML = '';
    });

    const tabTranslate = document.getElementById('tabTranslate');
    tabTranslate.addEventListener('click', () => {
        notificationContainer.innerHTML = '';
    });
}
