import { applyFixes, getTokenCount, updateProgress, updateTokensUsed, isExcludedTerm, formatPluginName, saveTranslatedFile } from './utils.js';

// Define sections to skip for translation
const skipTranslationSections = [
    "#. Plugin URI of the plugin",
    "#. Author of the plugin",
    "#. Author URI of the plugin",
    "# Copyright (C) ",
    "# This file is distributed under the same license as",
    "#. Plugin Name of the plugin",
    "#. Description of the plugin"
];

export async function processContent(content, excludedTerms, originalFileName, startTime) {
    const lines = content.split('\n');
    const normalizedExclusions = excludedTerms.map(term => term.toLowerCase());
    const exclusionMap = new Map();
    excludedTerms.forEach(term => exclusionMap.set(term.toLowerCase(), term));

    let translatedLines = [];
    let batch = [];
    const batchSize = 10;
    let totalTranslations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const totalStrings = lines.filter(line => line.startsWith('msgid')).length;

    updateProgress(0, totalStrings, startTime);

    const today = new Date();
    const revisionDate = today.toISOString().replace('T', ' ').split('.')[0] + '+0000';
    const pluginName = formatPluginName(originalFileName.replace('_FR_fr', ''));

    // Add the pluginName to the exclusion list by default
    normalizedExclusions.push(pluginName.toLowerCase());
    exclusionMap.set(pluginName.toLowerCase(), pluginName);

    // Add the header
    const header = createHeader(pluginName, revisionDate);
    translatedLines.push(header);

    // Process singular translations
    translatedLines = await processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime);

    // Remove invalid plural sections
    translatedLines = removeInvalidPluralSections(translatedLines);

    // Process plural translations
    translatedLines = await processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime);

    // Update progress and tokens used
    updateProgress(totalStrings, totalStrings, startTime);
    updateTokensUsed(totalInputTokens, totalOutputTokens);

    return translatedLines.join('\n');
}

function createHeader(pluginName, revisionDate) {
    return `# Translation of Plugins - ${pluginName} in French (France)
# This file is distributed under the same license as the Plugins - ${pluginName} package.
msgid ""
msgstr ""
"PO-Revision-Date: ${revisionDate}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n > 1);\\n"
"X-Generator: Translation Generator/1.0.0\\n"
"Language: fr\\n"
"Project-Id-Version: Plugins - ${pluginName}\\n"
`;
}

async function processSingularTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime) {
    let metadata = [];
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

        if (line.startsWith('msgid') && !line.startsWith('msgid ""') && !lines[i + 1]?.startsWith('msgid_plural')) {
            if (skipSection) {
                metadata = [];
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
                translatedLines.push(msgidLine);
                translatedLines.push(line);
                translatedLines.push('');
                metadata = [];
                msgidLine = '';
                totalTranslations++;
                updateProgress(totalTranslations, totalStrings, startTime);
                continue;
            }
            batch.push({ metadata: [...metadata], original: msgidLine, text: msgidText, index: translatedLines.length });
            metadata = [];
            msgidLine = '';

            if (batch.length === batchSize) {
                translatedLines = await translateBatch(batch, translatedLines, exclusionMap);
                totalTranslations += batch.length;
                updateProgress(totalTranslations, totalStrings, startTime);
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        translatedLines = await translateBatch(batch, translatedLines, exclusionMap);
        totalTranslations += batch.length;
        updateProgress(totalTranslations, totalStrings, startTime);
    }

    return translatedLines;
}

async function processPluralTranslations(lines, translatedLines, normalizedExclusions, exclusionMap, batchSize, totalTranslations, totalStrings, startTime) {
    let metadata = [];
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
                translatedLines.push(msgidLine);
                translatedLines.push(msgidPluralLine);
                translatedLines.push(`msgstr[0] ""`);
                translatedLines.push(`msgstr[1] ""`);
                translatedLines.push('');
                metadata = [];
                msgidLine = '';
                msgidPluralLine = '';
                totalTranslations++;
                updateProgress(totalTranslations, totalStrings, startTime);
                continue;
            }
            batch.push({
                metadata: [...metadata],
                original: msgidLine,
                text: msgidText,
                plural: msgidPluralLine,
                pluralText: msgidPluralText,
                index: translatedLines.length
            });
            metadata = [];
            msgidLine = '';
            msgidPluralLine = '';

            if (batch.length === batchSize) {
                translatedLines = await translatePluralBatch(batch, translatedLines, exclusionMap);
                totalTranslations += batch.length;
                updateProgress(totalTranslations, totalStrings, startTime);
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        translatedLines = await translatePluralBatch(batch, translatedLines, exclusionMap);
        totalTranslations += batch.length;
        updateProgress(totalTranslations, totalStrings, startTime);
    }

    return translatedLines;
}

async function translateBatch(batch, translatedLines, exclusionMap) {
    const translations = await translateTexts(batch.map(item => item.text));

    batch.forEach((item, index) => {
        let translation = translations[index];
        translation = applyFixes(item.text, translation, exclusionMap);
        translatedLines.push(...item.metadata);
        translatedLines.push(item.original);
        translatedLines.push(`msgstr "${translation}"`);
        translatedLines.push('');
    });

    return translatedLines;
}

async function translatePluralBatch(batch, translatedLines, exclusionMap) {
    const translations = await translateTexts(batch.map(item => item.text));
    const pluralTranslations = await translateTexts(batch.map(item => item.pluralText));

    batch.forEach((item, index) => {
        let translation = translations[index];
        translation = applyFixes(item.text, translation, exclusionMap);
        let pluralTranslation = pluralTranslations[index];
        pluralTranslation = applyFixes(item.pluralText, pluralTranslation, exclusionMap);

        translatedLines.push(...filterMetadata(item.metadata));
        translatedLines.push(item.original);
        translatedLines.push(item.plural);
        translatedLines.push(`msgstr[0] "${translation}"`);
        translatedLines.push(`msgstr[1] "${pluralTranslation}"`);
        translatedLines.push('');
    });

    return translatedLines;
}

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

export async function translateTexts(texts) {
    try {
        const response = await fetch('http://localhost:3000/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ texts })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.translatedTexts;
    } catch (error) {
        console.error('Failed to translate texts:', error);
        alert('Failed to translate texts. Check the console for more details.');
    }
}
