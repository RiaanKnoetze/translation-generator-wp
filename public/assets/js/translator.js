import { applyFixes, updateProgress, updateTokensUsed, isExcludedTerm, formatPluginName, saveTranslatedFile, getTokenCount } from './utils.js';

// Sections to skip during translation
const skipTranslationSections = [
    "#. Plugin URI of the plugin",
    "#. Author of the plugin",
    "#. Author URI of the plugin",
    "# Copyright (C) ",
    "# This file is distributed under the same license as",
    "#. Plugin Name of the plugin",
    "#. Description of the plugin"
];

// Plural forms mapping
const pluralFormsMapping = {
    "en_US": "nplurals=2; plural=(n != 1);", // English (United States)
    "es_ES": "nplurals=2; plural=(n != 1);", // Spanish (Spain)
    "de_DE": "nplurals=2; plural=(n != 1);", // German
    "fr_FR": "nplurals=2; plural=(n > 1);",  // French
    "it_IT": "nplurals=2; plural=(n != 1);", // Italian
    "pt_PT": "nplurals=2; plural=(n != 1);", // Portuguese (Portugal)
    "ru_RU": "nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2);", // Russian
    "nl_NL": "nplurals=2; plural=(n != 1);", // Dutch
    "ja": "nplurals=1; plural=0;",           // Japanese
    "zh_CN": "nplurals=1; plural=0;",        // Chinese (Simplified)
    "pl_PL": "nplurals=3; plural=(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);", // Polish
    "ro_RO": "nplurals=3; plural=(n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2);", // Romanian
    "hu_HU": "nplurals=2; plural=(n != 1);", // Hungarian
    "sv_SE": "nplurals=2; plural=(n != 1);", // Swedish
    "fi": "nplurals=2; plural=(n != 1);",    // Finnish
    "da_DK": "nplurals=2; plural=(n != 1);", // Danish
    "el": "nplurals=2; plural=(n != 1);",    // Greek
    "tr_TR": "nplurals=1; plural=0;",        // Turkish
    "he_IL": "nplurals=2; plural=(n != 1);", // Hebrew
    "ko_KR": "nplurals=1; plural=0;"         // Korean
    // Add other language mappings as necessary
};

// Main function to process the content for translation
export async function processContent(content, excludedTerms, originalFileName, startTime, selectedLanguage) {
    const lines = content.split('\n'); // Split the content into lines
    const normalizedExclusions = excludedTerms.map(term => term.toLowerCase()); // Normalize exclusions to lowercase
    const exclusionMap = new Map(); // Map to store original exclusions
    excludedTerms.forEach(term => exclusionMap.set(term.toLowerCase(), term)); // Populate the map

    let translatedLines = []; // Array to hold translated lines
    let batch = []; // Array to hold a batch of lines for translation
    const batchSize = 10; // Define the size of each batch
    let totalTranslations = 0; // Counter for total translations
    let inputTokens = 0; // Counter for input tokens
    let outputTokens = 0; // Counter for output tokens
    const totalStrings = lines.filter(line => line.startsWith('msgid')).length; // Count total strings to be translated

    updateProgress(0, totalStrings, startTime); // Initialize progress update

    const today = new Date();
    const revisionDate = today.toISOString().replace('T', ' ').split('.')[0] + '+0000'; // Format revision date
    const pluginName = formatPluginName(originalFileName.replace(/-[a-z]{2}_[A-Z]{2}$/, '')); // Format the plugin name

    normalizedExclusions.push(pluginName.toLowerCase()); // Add plugin name to exclusions
    exclusionMap.set(pluginName.toLowerCase(), pluginName); // Add to exclusion map

    const header = createHeader(pluginName, revisionDate, selectedLanguage); // Create the header for the translation file
    translatedLines.push(header); // Add the header to the translated lines

    // Process singular translations
    const singularResult = await processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens);
    translatedLines = singularResult.translatedLines;
    inputTokens = singularResult.inputTokens;
    outputTokens = singularResult.outputTokens;

    // Remove invalid plural sections
    translatedLines = removeInvalidPluralSections(translatedLines);

    // Process plural translations
    const pluralResult = await processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens);
    translatedLines = pluralResult.translatedLines;
    inputTokens = pluralResult.inputTokens;
    outputTokens = pluralResult.outputTokens;

    updateProgress(totalStrings, totalStrings, startTime); // Final progress update
    updateTokensUsed(inputTokens, outputTokens); // Update token usage

    return { translatedContent: translatedLines.join('\n'), selectedLanguage }; // Return the translated content and selected language
}

// Function to create the header for the translation file
function createHeader(pluginName, revisionDate, selectedLanguage) {
    const pluralForms = pluralFormsMapping[selectedLanguage] || "nplurals=2; plural=(n != 1);"; // Default to English plural forms if not found
    return `# Translation of Plugins - ${pluginName} in ${selectedLanguage}
# This file is distributed under the same license as the Plugins - ${pluginName} package.
msgid ""
msgstr ""
"PO-Revision-Date: ${revisionDate}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: ${pluralForms}\\n"
"X-Generator: Translation Generator/1.0.0\\n"
"Language: ${selectedLanguage}\\n"
"Project-Id-Version: Plugins - ${pluginName}\\n"
`;
}

// Function to process singular translations
async function processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens) {
    let metadata = []; // Array to hold metadata lines
    let msgidLine = ''; // Variable to hold the msgid line
    let skipSection = false; // Flag to indicate if the section should be skipped
    let batch = []; // Array to hold a batch of lines for translation

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith('#')) {
            metadata.push(line); // Add comment lines to metadata
            if (skipTranslationSections.some(section => line.includes(section))) {
                skipSection = true; // Set flag to skip this section
            }
            continue;
        }

        if (line.startsWith('msgid') && !line.startsWith('msgid ""') && !lines[i + 1]?.startsWith('msgid_plural')) {
            if (skipSection) {
                metadata = []; // Clear metadata
                msgidLine = ''; // Clear msgid line
                skipSection = false; // Reset skip flag
                continue;
            }

            msgidLine = line; // Store the msgid line
            continue;
        }

        if (line.startsWith('msgstr') && msgidLine) {
            const msgidText = msgidLine.match(/"(.*)"/)[1]; // Extract msgid text
            if (skipSection || msgidText === "" || isExcludedTerm(msgidText, normalizedExclusions)) {
                translatedLines.push(...metadata); // Add metadata to translated lines
                translatedLines.push(msgidLine); // Add msgid line
                translatedLines.push(line); // Add msgstr line
                translatedLines.push(''); // Add empty line
                metadata = []; // Clear metadata
                msgidLine = ''; // Clear msgid line
                totalTranslations++; // Increment translation count
                updateProgress(totalTranslations, totalStrings, startTime); // Update progress
                continue;
            }
            batch.push({ metadata: [...metadata], original: msgidLine, text: msgidText, index: translatedLines.length }); // Add to batch
            metadata = []; // Clear metadata
            msgidLine = ''; // Clear msgid line

            if (batch.length === batchSize) {
                const result = await translateBatch(batch, translatedLines, exclusionMap, selectedLanguage); // Translate the batch
                translatedLines = result.translatedLines;
                inputTokens += result.inputTokens;
                outputTokens += result.outputTokens;
                totalTranslations += batch.length; // Update total translations
                updateProgress(totalTranslations, totalStrings, startTime); // Update progress
                batch = []; // Clear batch
            }
        }
    }

    if (batch.length > 0) {
        const result = await translateBatch(batch, translatedLines, exclusionMap, selectedLanguage); // Translate remaining batch
        translatedLines = result.translatedLines;
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;
        totalTranslations += batch.length; // Update total translations
        updateProgress(totalTranslations, totalStrings, startTime); // Update progress
    }

    return { translatedLines, inputTokens, outputTokens };
}

// Function to process plural translations
async function processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens) {
    let metadata = []; // Array to hold metadata lines
    let msgidLine = ''; // Variable to hold the msgid line
    let msgidPluralLine = ''; // Variable to hold the msgid_plural line
    let skipSection = false; // Flag to indicate if the section should be skipped
    let batch = []; // Array to hold a batch of lines for translation

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith('#')) {
            metadata.push(line); // Add comment lines to metadata
            continue;
        }

        if (line.startsWith('msgid') && !line.startsWith('msgid ""') && lines[i + 1]?.startsWith('msgid_plural')) {
            msgidLine = line; // Store the msgid line
            continue;
        }

        if (line.startsWith('msgid_plural')) {
            msgidPluralLine = line; // Store the msgid_plural line
            continue;
        }

        if (line.startsWith('msgstr') && msgidPluralLine) {
            const msgidText = msgidLine.match(/"(.*)"/)[1]; // Extract msgid text
            const msgidPluralText = msgidPluralLine.match(/"(.*)"/)[1]; // Extract msgid_plural text
            if (skipSection || msgidText === "" || isExcludedTerm(msgidText, normalizedExclusions)) {
                translatedLines.push(...metadata); // Add metadata to translated lines
                translatedLines.push(msgidLine); // Add msgid line
                translatedLines.push(msgidPluralLine); // Add msgid_plural line
                translatedLines.push(`msgstr[0] ""`); // Add msgstr[0] line
                translatedLines.push(`msgstr[1] ""`); // Add msgstr[1] line
                translatedLines.push(''); // Add empty line
                metadata = []; // Clear metadata
                msgidLine = ''; // Clear msgid line
                msgidPluralLine = ''; // Clear msgid_plural line
                totalTranslations++; // Increment translation count
                updateProgress(totalTranslations, totalStrings, startTime); // Update progress
                continue;
            }
            batch.push({
                metadata: [...metadata],
                original: msgidLine,
                text: msgidText,
                plural: msgidPluralLine,
                pluralText: msgidPluralText,
                index: translatedLines.length
            }); // Add to batch
            metadata = []; // Clear metadata
            msgidLine = ''; // Clear msgid line
            msgidPluralLine = ''; // Clear msgid_plural line

            if (batch.length === batchSize) {
                const result = await translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage); // Translate the batch
                translatedLines = result.translatedLines;
                inputTokens += result.inputTokens;
                outputTokens += result.outputTokens;
                totalTranslations += batch.length; // Update total translations
                updateProgress(totalTranslations, totalStrings, startTime); // Update progress
                batch = []; // Clear batch
            }
        }
    }

    if (batch.length > 0) {
        const result = await translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage); // Translate remaining batch
        translatedLines = result.translatedLines;
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;
        totalTranslations += batch.length; // Update total translations
        updateProgress(totalTranslations, totalStrings, startTime); // Update progress
    }

    return { translatedLines, inputTokens, outputTokens };
}

// Function to translate a batch of singular texts
async function translateBatch(batch, translatedLines, exclusionMap, selectedLanguage) {
    const translations = await translateTexts(batch.map(item => item.text), selectedLanguage); // Translate the batch of texts
    const inputTokens = batch.reduce((sum, item) => sum + getTokenCount(item.text), 0); // Calculate input tokens
    const outputTokens = translations.reduce((sum, translation) => sum + getTokenCount(translation), 0); // Calculate output tokens

    batch.forEach((item, index) => {
        let translation = translations[index]; // Get the translated text
        translation = applyFixes(item.text, translation, exclusionMap); // Apply fixes to the translation
        translatedLines.push(...item.metadata); // Add metadata to translated lines
        translatedLines.push(item.original); // Add original msgid line
        translatedLines.push(`msgstr "${translation}"`); // Add translated msgstr line
        translatedLines.push(''); // Add empty line
    });

    console.log(`Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Cost: $${((inputTokens / 1000) * 0.005 + (outputTokens / 1000) * 0.015).toFixed(2)}`);

    return { translatedLines, inputTokens, outputTokens };
}

// Function to translate a batch of plural texts
async function translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage) {
    const translations = await translateTexts(batch.map(item => item.text), selectedLanguage); // Translate the batch of singular texts
    const pluralTranslations = await translateTexts(batch.map(item => item.pluralText), selectedLanguage); // Translate the batch of plural texts
    const inputTokens = batch.reduce((sum, item) => sum + getTokenCount(item.text) + getTokenCount(item.pluralText), 0); // Calculate input tokens
    const outputTokens = translations.reduce((sum, translation) => sum + getTokenCount(translation), 0) + pluralTranslations.reduce((sum, translation) => sum + getTokenCount(translation), 0); // Calculate output tokens

    batch.forEach((item, index) => {
        let translation = translations[index]; // Get the translated singular text
        translation = applyFixes(item.text, translation, exclusionMap); // Apply fixes to the translation
        let pluralTranslation = pluralTranslations[index]; // Get the translated plural text
        pluralTranslation = applyFixes(item.pluralText, pluralTranslation, exclusionMap); // Apply fixes to the plural translation

        translatedLines.push(...filterMetadata(item.metadata)); // Add filtered metadata to translated lines
        translatedLines.push(item.original); // Add original msgid line
        translatedLines.push(item.plural); // Add original msgid_plural line
        translatedLines.push(`msgstr[0] "${translation}"`); // Add translated msgstr[0] line
        translatedLines.push(`msgstr[1] "${pluralTranslation}"`); // Add translated msgstr[1] line
        translatedLines.push(''); // Add empty line
    });

    console.log(`Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Cost: $${((inputTokens / 1000) * 0.005 + (outputTokens / 1000) * 0.015).toFixed(2)}`);

    return { translatedLines, inputTokens, outputTokens };
}

// Function to remove invalid plural sections from the lines
function removeInvalidPluralSections(lines) {
    let result = [];
    let skipSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('msgid_plural')) {
            skipSection = true;
            continue;
        }

        if (skipSection && (line.startsWith('msgstr') || line.startsWith('#'))) {
            continue;
        }

        if (skipSection && !line.startsWith('msgstr') && !line.startsWith('#')) {
            skipSection = false;
        }

        if (!skipSection) {
            result.push(line);
        }
    }

    return result;
}

// Function to filter metadata lines
function filterMetadata(metadata) {
    const filteredMetadata = [];
    let lastTranslatorsIndex = -1;

    for (let i = 0; i < metadata.length; i++) {
        const line = metadata[i];
        if (line.startsWith('#. translators')) {
            lastTranslatorsIndex = i;
        }
    }

    if (lastTranslatorsIndex !== -1) {
        filteredMetadata.push(metadata[lastTranslatorsIndex]);
        if (lastTranslatorsIndex + 1 < metadata.length && metadata[lastTranslatorsIndex + 1].startsWith('#:')) {
            filteredMetadata.push(metadata[lastTranslatorsIndex + 1]);
        }
    }

    return filteredMetadata;
}

// Function to initialize the file check icon
export function initializeFileCheckIcon() {
    const fileCheckIcon = document.getElementById('fileCheckIcon');
    fileCheckIcon.addEventListener('click', function () {
        if (fileCheckIcon.classList.contains('fa-download')) {
            const translatedContent = ''; // Retrieve the translated content here
            const originalFileName = ''; // Retrieve the original file name here
            saveTranslatedFile(translatedContent, originalFileName);
        }
    });
}

// Function to send texts to the server for translation
async function translateTexts(texts, selectedLanguage) {
    try {
        const response = await fetch('http://localhost:3000/translate', {
            method: 'POST', // HTTP method
            headers: {
                'Content-Type': 'application/json' // Content type of the request
            },
            body: JSON.stringify({ texts, language: selectedLanguage }) // Data to be sent in the request body
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Parse the JSON response from the server
        return data.translatedTexts; // Return the translated texts
    } catch (error) {
        console.error('Failed to translate texts:', error); // Log any errors that occur during the request
        alert('Failed to translate texts. Check the console for more details.'); // Alert the user about the error
    }
}
