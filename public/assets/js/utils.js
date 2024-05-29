export function formatPluginName(name) {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function applyFixes(original, translation, exclusionMap) {
    if (!original || !translation) return translation;
    // Fix quotation marks
    translation = translation.replace(/«/g, '"').replace(/»/g, '"');

    // Ensure placeholders remain in the translation
    const placeholders = original.match(/%[0-9]+\$[a-zA-Z]/g) || [];
    placeholders.forEach(placeholder => {
        if (!translation.includes(placeholder)) {
            translation = placeholder + translation.replace(new RegExp(placeholder.replace('$', '\\$'), 'g'), '');
        }
    });

    // Remove extra spaces before punctuation
    translation = translation.replace(/\s+([.,?!])/g, '$1');

    // Ensure spaces around single words if present in the original
    if (/^\s/.test(original)) {
        translation = ` ${translation}`;
    }
    if (/\s$/.test(original)) {
        translation = `${translation} `;
    }

    // Ensure excluded terms are preserved with correct casing
    exclusionMap.forEach((originalTerm, normalizedTerm) => {
        const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'gi');
        translation = translation.replace(regex, match => originalTerm);
    });

    // Remove any unwanted characters (like <0xa0>)
    translation = translation.replace(/[\u00A0]/g, ' ');

    // Escape quotation marks
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
    const inputCostPerMillionTokens = 5.00; // Input cost per 1M tokens in $
    const outputCostPerMillionTokens = 15.00; // Output cost per 1M tokens in $

    const inputCost = (inputTokens / 1000000) * inputCostPerMillionTokens;
    const outputCost = (outputTokens / 1000000) * outputCostPerMillionTokens;
    const totalCost = inputCost + outputCost;
    tokensUsed.textContent = `Tokens used: ${inputTokens + outputTokens} ($${totalCost.toFixed(2)})`;
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

export function saveTranslatedFile(translatedContent, originalFileName) {
    const blob = new Blob([translatedContent], { type: 'text/plain' });
    const link = document.createElement('a');
    const newFileName = `${originalFileName}-fr_FR.po`;
    link.href = window.URL.createObjectURL(blob);
    link.download = newFileName;
    link.click();
}

