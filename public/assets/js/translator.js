import { applyFixes, updateProgress, updateTokensUsed, formatPluginName, saveTranslatedFile, getTokenCount, showNotification } from './utils.js';

/**
 * Sections to skip during translation
 */
const skipTranslationSections = [
    "#. Plugin URI of the plugin",
    "#. Author of the plugin",
    "#. Author URI of the plugin",
    "# Copyright (C) ",
    "# This file is distributed under the same license as",
    "#. Plugin Name of the plugin",
    "#. Description of the plugin"
];

/**
 * Plural forms mapping
 */
const pluralFormsMapping = {
    "en_US": "nplurals=2; plural=(n != 1);", // English (United States)
    "es_ES": "nplurals=2; plural=(n != 1);", // Spanish (Spain)
    "de_DE": "nplurals=2; plural=(n != 1);", // German
    "fr_FR": "nplurals=2; plural=(n > 1);",  // French
    "it_IT": "nplurals=2; plural=(n != 1);", // Italian
    "pt_PT": "nplurals=2; plural=(n != 1);", // Portuguese (Portugal)
    "ru_RU": "nplurals=3; plural=(n % 10 == 1 && n % 100 != 11) ? 0 : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 1 : 2);", // Russian
    "nl_NL": "nplurals=2; plural=(n != 1);", // Dutch
    "ja": "nplurals=1; plural=0;",           // Japanese
    "zh_CN": "nplurals=1; plural=0;",        // Chinese (Simplified)
    "pl_PL": "nplurals=3; plural=(n == 1) ? 0 : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 1 : 2);", // Polish
    "ro_RO": "nplurals=3; plural=(n == 1) ? 0 : ((n == 0 || n % 100 >= 2 && n % 100 <= 19) ? 1 : 2);", // Romanian
    "hu_HU": "nplurals=2; plural=(n != 1);", // Hungarian
    "sv_SE": "nplurals=2; plural=(n != 1);", // Swedish
    "fi": "nplurals=2; plural=(n != 1);",    // Finnish
    "da_DK": "nplurals=2; plural=(n != 1);", // Danish
    "el": "nplurals=2; plural=(n != 1);",    // Greek
    "tr_TR": "nplurals=1; plural=0;",        // Turkish
    "he_IL": "nplurals=2; plural=n != 1;\n", // Hebrew
    "ko_KR": "nplurals=1; plural=0;"         // Korean
};

/**
 * Main function to process the content for translation
 * 
 * @param {string} content - The content to be translated.
 * @param {Array<string>} excludedTerms - Terms to be excluded from translation.
 * @param {string} originalFileName - The original filename.
 * @param {Date} startTime - The start time of the translation.
 * @param {string} selectedLanguage - The selected language for translation.
 * @param {number} batchSize - The size of the batch for translation.
 * @param {string} progressBarId - The ID of the progress bar.
 * @returns {Object} - The translated content and selected language.
 */
export async function processContent(content, excludedTerms, originalFileName, startTime, selectedLanguage, batchSize, progressBarId) {
    const lines = content.split('\n');
    const normalizedExclusions = excludedTerms.map(term => term.toLowerCase());
    const exclusionMap = new Map();
    excludedTerms.forEach(term => exclusionMap.set(term.toLowerCase(), term));

    let translatedLines = [];
    let totalTranslations = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const totalStrings = lines.filter(line => line.startsWith('msgid')).length;

    updateProgress(0, totalStrings, startTime, progressBarId);

    const today = new Date();
    const revisionDate = today.toISOString().replace('T', ' ').split('.')[0] + '+0000';
    const pluginName = formatPluginName(originalFileName.replace(/-[a-z]{2}_[A-Z]{2}$/, ''));

    normalizedExclusions.push(pluginName.toLowerCase());
    exclusionMap.set(pluginName.toLowerCase(), pluginName);

    const selectedModel = window.settings.selectedModel || 'gpt-4o';
    const header = createHeader(pluginName, revisionDate, selectedLanguage, selectedModel);
    translatedLines.push(header);

    const singularResult = await processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens, progressBarId);
    translatedLines = singularResult.translatedLines;
    inputTokens = singularResult.inputTokens;
    outputTokens = singularResult.outputTokens;

    translatedLines = removeOrphanLines(translatedLines);
    translatedLines = removeInvalidPluralSections(translatedLines);

    const pluralResult = await processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens, progressBarId);
    translatedLines = pluralResult.translatedLines;
    inputTokens = pluralResult.inputTokens;
    outputTokens = pluralResult.outputTokens;

    updateProgress(totalStrings, totalStrings, startTime, progressBarId);
    updateTokensUsed(inputTokens, outputTokens);

    return { translatedContent: translatedLines.join('\n'), selectedLanguage };
}

/**
 * Function to create the header for the translation file
 * 
 * @param {string} pluginName - The name of the plugin.
 * @param {string} revisionDate - The revision date.
 * @param {string} selectedLanguage - The selected language.
 * @param {string} selectedModel - The selected model.
 * @returns {string} - The header for the translation file.
 */
function createHeader(pluginName, revisionDate, selectedLanguage, selectedModel) {
    const pluralForms = pluralFormsMapping[selectedLanguage] || "nplurals=2; plural=(n != 1);";
    return `# Translation of Plugins - ${pluginName} in ${selectedLanguage}
# This file is distributed under the same license as the Plugins - ${pluginName} package.
msgid ""
msgstr ""
"PO-Revision-Date: ${revisionDate}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: ${pluralForms}\\n"
"X-Generator: Translation Generator: ${selectedModel}\\n"
"Language: ${selectedLanguage}\\n"
"Project-Id-Version: Plugins - ${pluginName}\\n"
`;
}

/**
 * Function to check if the term should be excluded from translation
 * 
 * @param {string} term - The term to be checked.
 * @param {Array<string>} exclusions - The list of exclusions.
 * @returns {boolean} - True if the term should be excluded, false otherwise.
 */
function isExcludedTerm(term, exclusions) {
    const singleLetterPattern = /^[a-zA-Z]$/;
    const placeholderPattern = /%[0-9]*\$?[a-zA-Z]/g;
    const isOnlyPlaceholders = term.match(placeholderPattern)?.join(' ') === term.trim();

    return singleLetterPattern.test(term) ||
           isOnlyPlaceholders ||
           exclusions.includes(term.toLowerCase());
}

/**
 * Function to process singular translations
 * 
 * @param {Array<string>} lines - The lines to be processed.
 * @param {Array<string>} translatedLines - The translated lines.
 * @param {Array<string>} normalizedExclusions - The normalized exclusions.
 * @param {Map<string, string>} exclusionMap - The exclusion map.
 * @param {number} batchSize - The batch size.
 * @param {number} totalTranslations - The total number of translations.
 * @param {number} totalStrings - The total number of strings.
 * @param {Date} startTime - The start time.
 * @param {string} selectedLanguage - The selected language.
 * @param {number} inputTokens - The input tokens.
 * @param {number} outputTokens - The output tokens.
 * @param {string} progressBarId - The progress bar ID.
 * @returns {Object} - The result of the singular translations.
 */
async function processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens, progressBarId) {
    let metadata = [];
    let msgctxt = '';
    let msgidLine = '';
    let skipSection = false;
    let batch = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith('#')) {
            metadata.push(line);
            if (skipTranslationSections.some(section => line.includes(section))) {
                skipSection = true;
            }
            continue;
        }

        if (line.startsWith('msgctxt')) {
            msgctxt = line;
            continue;
        }

        if (line.startsWith('msgid') && !line.startsWith('msgid ""') && !lines[i + 1]?.startsWith('msgid_plural')) {
            if (skipSection) {
                metadata = [];
                msgctxt = '';
                msgidLine = '';
                skipSection = false;
                continue;
            }

            msgidLine = line;
            continue;
        }

        if (line.startsWith('msgstr') && msgidLine) {
            const msgidText = msgidLine.match(/"(.*)"/)[1];
            if (skipSection || msgidText === "" || isExcludedTerm(msgidText, normalizedExclusions)) {
                translatedLines.push(...metadata);
                if (msgctxt) translatedLines.push(msgctxt);
                translatedLines.push(msgidLine);
                translatedLines.push(line);
                translatedLines.push('');
                metadata = [];
                msgctxt = '';
                msgidLine = '';
                totalTranslations++;
                updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
                continue;
            }
            batch.push({ metadata: [...metadata], msgctxt: msgctxt, original: msgidLine, text: msgidText, index: translatedLines.length });
            metadata = [];
            msgctxt = '';
            msgidLine = '';

            if (batch.length === batchSize) {
                const result = await translateBatch(batch, translatedLines, exclusionMap, selectedLanguage);
                translatedLines = result.translatedLines;
                inputTokens += result.inputTokens;
                outputTokens += result.outputTokens;
                totalTranslations += batch.length;
                updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        const result = await translateBatch(batch, translatedLines, exclusionMap, selectedLanguage);
        translatedLines = result.translatedLines;
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;
        totalTranslations += batch.length;
        updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
    }

    return { translatedLines, inputTokens, outputTokens };
}

/**
 * Function to process plural translations
 * 
 * @param {Array<string>} lines - The lines to be processed.
 * @param {Array<string>} translatedLines - The translated lines.
 * @param {Array<string>} normalizedExclusions - The normalized exclusions.
 * @param {Map<string, string>} exclusionMap - The exclusion map.
 * @param {number} batchSize - The batch size.
 * @param {number} totalTranslations - The total number of translations.
 * @param {number} totalStrings - The total number of strings.
 * @param {Date} startTime - The start time.
 * @param {string} selectedLanguage - The selected language.
 * @param {number} inputTokens - The input tokens.
 * @param {number} outputTokens - The output tokens.
 * @param {string} progressBarId - The progress bar ID.
 * @returns {Object} - The result of the plural translations.
 */
async function processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime, selectedLanguage, inputTokens, outputTokens, progressBarId) {
    let metadata = [];
    let msgctxt = '';
    let msgidLine = '';
    let msgidPluralLine = '';
    let skipSection = false;
    let batch = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.startsWith('#')) {
            metadata.push(line);
            continue;
        }

        if (line.startsWith('msgctxt')) {
            msgctxt = line;
            continue;
        }

        if (line.startsWith('msgid') && !line.startsWith('msgid ""') && lines[i + 1]?.startsWith('msgid_plural')) {
            msgidLine = line;
            continue;
        }

        if (line.startsWith('msgid_plural')) {
            msgidPluralLine = line;
            continue;
        }

        if (line.startsWith('msgstr') && msgidPluralLine) {
            const msgidText = msgidLine.match(/"(.*)"/)[1];
            const msgidPluralText = msgidPluralLine.match(/"(.*)"/)[1];
            if (skipSection || msgidText === "" || isExcludedTerm(msgidText, normalizedExclusions)) {
                translatedLines.push(...metadata);
                if (msgctxt) translatedLines.push(msgctxt);
                translatedLines.push(msgidLine);
                translatedLines.push(msgidPluralLine);
                translatedLines.push(`msgstr[0] ""`);
                translatedLines.push(`msgstr[1] ""`);
                const nplurals = pluralFormsMapping[selectedLanguage]?.match(/nplurals=(\d+);/)[1] || 2;
                for (let j = 2; j < nplurals; j++) {
                    translatedLines.push(`msgstr[${j}] ""`);
                }
                translatedLines.push('');
                metadata = [];
                msgctxt = '';
                msgidLine = '';
                msgidPluralLine = '';
                totalTranslations++;
                updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
                continue;
            }
            batch.push({
                metadata: [...metadata],
                msgctxt: msgctxt,
                original: msgidLine,
                text: msgidText,
                plural: msgidPluralLine,
                pluralText: msgidPluralText,
                index: translatedLines.length
            });
            metadata = [];
            msgctxt = '';
            msgidLine = '';
            msgidPluralLine = '';

            if (batch.length === batchSize) {
                const result = await translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage);
                translatedLines = result.translatedLines;
                inputTokens += result.inputTokens;
                outputTokens += result.outputTokens;
                totalTranslations += batch.length;
                updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        const result = await translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage);
        translatedLines = result.translatedLines;
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;
        totalTranslations += batch.length;
        updateProgress(totalTranslations, totalStrings, startTime, progressBarId);
    }

    return { translatedLines, inputTokens, outputTokens };
}

/**
 * Function to translate a batch of singular texts
 * 
 * @param {Array<Object>} batch - The batch of texts to be translated.
 * @param {Array<string>} translatedLines - The translated lines.
 * @param {Map<string, string>} exclusionMap - The exclusion map.
 * @param {string} selectedLanguage - The selected language.
 * @returns {Object} - The result of the batch translation.
 */
async function translateBatch(batch, translatedLines, exclusionMap, selectedLanguage) {
    const translations = await translateTexts(batch.map(item => item.text), selectedLanguage);
    const inputTokens = batch.reduce((sum, item) => sum + getTokenCount(item.text), 0);
    const outputTokens = translations.reduce((sum, translation) => sum + getTokenCount(translation), 0);
    const combinedTokens = inputTokens + outputTokens;

    batch.forEach((item, index) => {
        let translation = translations[index];
        translation = applyFixes(item.text, translation, exclusionMap);
        const placeholders = item.text.match(/%[0-9]*\$?[a-zA-Z]/g) || [];
        placeholders.forEach(placeholder => {
            if (!translation.includes(placeholder)) {
                translation = placeholder + ' ' + translation;
            }
        });
        translatedLines.push(...item.metadata);
        if (item.msgctxt) translatedLines.push(item.msgctxt);
        translatedLines.push(item.original);
        if (item.text.match(/%[0-9]*\$?[a-zA-Z]/g)?.join(' ') === item.text.trim()) {
            translatedLines.push(`msgstr "${item.text}"`);
        } else {
            translatedLines.push(`msgstr "${translation}"`);
        }
        translatedLines.push('');
    });

    console.log(`Combined tokens: ${combinedTokens}, Cost: $${((inputTokens / 1000) * 0.005 + (outputTokens / 1000) * 0.015).toFixed(5)}`);
    return { translatedLines, inputTokens, outputTokens };
}

/**
 * Function to translate a batch of plural texts
 * 
 * @param {Array<Object>} batch - The batch of texts to be translated.
 * @param {Array<string>} translatedLines - The translated lines.
 * @param {Map<string, string>} exclusionMap - The exclusion map.
 * @param {string} selectedLanguage - The selected language.
 * @returns {Object} - The result of the batch translation.
 */
async function translatePluralBatch(batch, translatedLines, exclusionMap, selectedLanguage) {
    const singularTexts = batch.map(item => item.text);
    const pluralTexts = batch.map(item => item.pluralText);
    
    const singularTranslations = await translateTexts(singularTexts, selectedLanguage);
    const pluralTranslations = await translateTexts(pluralTexts, selectedLanguage);
    
    const inputTokens = batch.reduce((sum, item) => sum + getTokenCount(item.text) + getTokenCount(item.pluralText), 0);
    const outputTokens = singularTranslations.reduce((sum, translation) => sum + getTokenCount(translation), 0) +
                          pluralTranslations.reduce((sum, translation) => sum + getTokenCount(translation), 0);
    const combinedTokens = inputTokens + outputTokens;

    batch.forEach((item, index) => {
        let singularTranslation = singularTranslations[index];
        singularTranslation = applyFixes(item.text, singularTranslation, exclusionMap);

        let pluralTranslation = pluralTranslations[index];
        pluralTranslation = applyFixes(item.pluralText, pluralTranslation, exclusionMap);

        translatedLines.push(...filterMetadata(item.metadata));
        if (item.msgctxt) translatedLines.push(item.msgctxt);
        translatedLines.push(item.original);
        translatedLines.push(item.plural);

        translatedLines.push(`msgstr[0] "${singularTranslation}"`);
        translatedLines.push(`msgstr[1] "${pluralTranslation}"`);

        const nplurals = pluralFormsMapping[selectedLanguage]?.match(/nplurals=(\d+);/)[1] || 2;

        for (let j = 2; j < nplurals; j++) {
            translatedLines.push(`msgstr[${j}] "${pluralTranslation}"`);
        }

        translatedLines.push('');
    });

    console.log(`Combined tokens: ${combinedTokens}, Cost: $${((inputTokens / 1000) * 0.005 + (outputTokens / 1000) * 0.015).toFixed(5)}`);

    return { translatedLines, inputTokens, outputTokens };
}

/**
 * Function to remove invalid plural sections from the lines
 * 
 * @param {Array<string>} lines - The lines to be processed.
 * @returns {Array<string>} - The lines without invalid plural sections.
 */
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

/**
 * Function to remove orphan lines
 * 
 * @param {Array<string>} lines - The lines to be processed.
 * @returns {Array<string>} - The lines without orphans.
 */
function removeOrphanLines(lines) {
    let result = [];
    let skipNextLine = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#: ') && lines[i + 1]?.trim() === '') {
            skipNextLine = true;
            continue;
        }

        if (skipNextLine && line.trim() === '') {
            skipNextLine = false;
            continue;
        }

        result.push(line);
    }

    return result;
}

/**
 * Function to filter metadata lines
 * 
 * @param {Array<string>} metadata - The metadata lines.
 * @returns {Array<string>} - The filtered metadata lines.
 */
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

/**
 * Function to send texts to the server for translation
 * 
 * @param {Array<string>} texts - The texts to be translated.
 * @param {string} language - The target language.
 * @returns {Array<string>} - The translated texts.
 */
async function translateTexts(texts, language) {
    try {
        const response = await fetch('http://localhost:3000/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ texts, language })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.translatedTexts;
    } catch (error) {
        console.error('Failed to translate texts:', error);
        showNotification('Failed to translate texts. Check the console for more details.', 'red', 'translate-notification-container');
        throw error;
    }
}
