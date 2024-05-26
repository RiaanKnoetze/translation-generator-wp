document.addEventListener('DOMContentLoaded', function() {
    const uploadInput = document.getElementById('fileUpload');
    const fileNameDisplay = document.getElementById('fileName');
    const fileDisplayContainer = document.getElementById('fileDisplayContainer');
    const translateButton = document.getElementById('translateBtn');
    const excludedTermsInput = document.getElementById('excludedTerms');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const estimatedTime = document.getElementById('estimatedTime');
    const stringsTranslated = document.getElementById('stringsTranslated');
    const tokensUsed = document.getElementById('tokensUsed');
    const fileCheckIcon = document.getElementById('fileCheckIcon');
    let originalFileName = '';
    let startTime;
    let translatedContent = ''; // To store the translated content

    const inputCostPerMillionTokens = 5.00; // Input cost per 1M tokens in $
    const outputCostPerMillionTokens = 15.00; // Output cost per 1M tokens in $

    const skipTranslationSections = [
        "#. Plugin URI of the plugin",
        "#. Author of the plugin",
        "#. Author URI of the plugin",
        "# Copyright (C) ",
        "# This file is distributed under the same license as",
        "#. Plugin Name of the plugin",
        "#. Description of the plugin"
    ];

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

    translateButton.addEventListener('click', async function() {
        fileCheckIcon.classList.add('hidden'); // Hide the check icon
        fileCheckIcon.className = 'fa-solid fa-spinner file-check-icon text-gray-800 fa-spin'; // Show the spinner icon
        fileCheckIcon.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        const file = uploadInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            const content = e.target.result;
            const excludedTerms = excludedTermsInput.value.split(',').map(term => term.trim());
            startTime = new Date();
            translatedContent = await processContent(content, excludedTerms);
            saveTranslatedFile(translatedContent, originalFileName);
            setTimeout(() => {
                progressContainer.classList.add('hide'); // Slide out
                setTimeout(() => progressContainer.classList.add('hidden'), 1000); // Hide after slide-out
                fileCheckIcon.classList.add('hidden'); // Hide the spinner icon
                fileCheckIcon.className = 'fa-solid fa-download file-check-icon text-gray-800'; // Show the download icon
                fileCheckIcon.classList.remove('hidden');
            }, 2000); // Wait 2 seconds before starting slide-out
        };
        reader.readAsText(file);
    });

    fileCheckIcon.addEventListener('click', function() {
        if (fileCheckIcon.classList.contains('fa-download')) {
            saveTranslatedFile(translatedContent, originalFileName);
        }
    });

    async function processContent(content, excludedTerms) {
        const lines = content.split('\n');
        const normalizedExclusions = excludedTerms.map(term => term.toLowerCase());
        const exclusionMap = new Map();
        excludedTerms.forEach(term => exclusionMap.set(term.toLowerCase(), term));

        let batch = [];
        let translatedLines = [];
        const batchSize = 10;
        let totalTranslations = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const totalStrings = lines.filter(line => line.startsWith('msgid')).length;

        updateProgress(0, totalStrings);

        const today = new Date();
        const revisionDate = today.toISOString().replace('T', ' ').split('.')[0] + '+0000';
        const pluginName = formatPluginName(originalFileName.replace('_FR_fr', '')); // Format the plugin name

        // Add the pluginName to the exclusion list by default
        normalizedExclusions.push(pluginName.toLowerCase());
        exclusionMap.set(pluginName.toLowerCase(), pluginName);

        // Add the header
        const header = `# Translation of Plugins - ${pluginName} in French (France)
# This file is distributed under the same license as the Plugins - ${pluginName} package.
msgid ""
msgstr ""
"PO-Revision-Date: ${revisionDate}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=n > 1;\\n"
"X-Generator: Translation Generator/1.0.0\\n"
"Language: fr\\n"
"Project-Id-Version: Plugins - ${pluginName}\\n"
`;
        translatedLines.push(header);

        let metadata = []; // To hold metadata like comments and references
        let msgidLine = ''; // To hold the msgid line
        let skipSection = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (line.startsWith('#')) {
                // Collect metadata lines
                metadata.push(line);

                // Check if this section should be skipped
                if (skipTranslationSections.some(section => line.includes(section))) {
                    skipSection = true;
                }
                continue;
            }

            if (line.startsWith('msgid') && !line.startsWith('msgid ""')) {
                if (skipSection) {
                    // Skip this entire section
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
                    translatedLines.push(`msgstr "${exclusionMap.get(msgidText.toLowerCase()) || msgidText}"`);
                    translatedLines.push(''); // Add an empty line
                    metadata = [];
                    msgidLine = '';
                    totalTranslations++;
                    updateProgress(totalTranslations, totalStrings);
                    continue;
                }
                if (isURL(msgidText)) {
                    translatedLines.push(...metadata);
                    translatedLines.push(msgidLine);
                    translatedLines.push(`msgstr "${msgidText}"`);
                    translatedLines.push(''); // Add an empty line
                    metadata = [];
                    msgidLine = '';
                    totalTranslations++;
                    updateProgress(totalTranslations, totalStrings);
                    continue;
                }
                batch.push({ metadata: [...metadata], original: msgidLine, text: msgidText, index: translatedLines.length });
                metadata = [];
                msgidLine = '';

                if (batch.length === batchSize) {
                    const translations = await translateTexts(batch.map(item => item.text));
                    batch.forEach((item, index) => {
                        let translation = translations[index];
                        translation = applyFixes(item.text, translation);
                        translatedLines.push(...item.metadata);
                        translatedLines.push(item.original);
                        translatedLines.push(`msgstr "${translation}"`);
                        translatedLines.push(''); // Add an empty line
                        totalTranslations++;
                        totalInputTokens += getTokenCount(item.text);
                        totalOutputTokens += getTokenCount(translation);
                        updateProgress(totalTranslations, totalStrings);
                    });
                    batch = []; // Clear the batch after processing
                }
            }
        }

        // Process any remaining items in the batch
        if (batch.length > 0) {
            const translations = await translateTexts(batch.map(item => item.text));
            batch.forEach((item, index) => {
                let translation = translations[index];
                translation = applyFixes(item.text, translation);
                translatedLines.push(...item.metadata);
                translatedLines.push(item.original);
                translatedLines.push(`msgstr "${translation}"`);
                translatedLines.push(''); // Add an empty line
                totalTranslations++;
                totalInputTokens += getTokenCount(item.text);
                totalOutputTokens += getTokenCount(translation);
                updateProgress(totalTranslations, totalStrings);
            });
        }

        updateProgress(totalStrings, totalStrings); // Ensure progress shows 100% at the end
        updateTokensUsed(totalInputTokens, totalOutputTokens); // Update total tokens used
        return translatedLines.join('\n');
    }

    function formatPluginName(name) {
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    function applyFixes(original, translation) {
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

        // Handle abbreviations
        translation = translation.replace(/\bSans objet\b/g, 'S/O');

        // Ensure spaces around single words if present in the original
        if (/^\s/.test(original)) {
            translation = ` ${translation}`;
        }
        if (/\s$/.test(original)) {
            translation = `${translation} `;
        }

        // Remove any unwanted characters (like <0xa0>)
        translation = translation.replace(/[\u00A0]/g, ' ');

        // Escape quotation marks
        translation = translation.replace(/"/g, '\\"');

        return translation;
    }

    async function translateTexts(texts) {
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

    function isExcludedTerm(term, normalizedExclusions) {
        return normalizedExclusions.includes(term.toLowerCase());
    }

    function isURL(str) {
        const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
    }

    function saveTranslatedFile(translatedContent, originalFileName) {
        const blob = new Blob([translatedContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${originalFileName}_FR_fr.po`;
        link.click();
    }

    function updateProgress(translated, total) {
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

    function updateTokensUsed(inputTokens, outputTokens) {
        const inputCost = (inputTokens / 1000000) * inputCostPerMillionTokens;
        const outputCost = (outputTokens / 1000000) * outputCostPerMillionTokens;
        const totalCost = inputCost + outputCost;
        tokensUsed.textContent = `Tokens used: ${inputTokens + outputTokens} ($${totalCost.toFixed(2)})`;
    }

    function getTokenCount(text) {
        return text.split(/\s+/).length;
    }

    function resetProgressAndTokens() {
        stringsTranslated.textContent = `Strings translated: 0/0`;
        tokensUsed.textContent = `Tokens used: 0 ($0.00)`;
    }

    function resetExcludedTerms() {
        excludedTermsInput.value = '';
    }

    function addPluginNameToExclusions(fileName) {
        const pluginName = formatPluginName(fileName.replace('_FR_fr', ''));
        const existingTerms = excludedTermsInput.value.split(',').map(term => term.trim()).filter(term => term !== '');
        if (!existingTerms.includes(pluginName)) {
            existingTerms.push(pluginName);
        }
        excludedTermsInput.value = existingTerms.join(', ');
    }

    function calculateStringsInFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const totalStrings = content.split('\n').filter(line => line.startsWith('msgid')).length;
            stringsTranslated.textContent = `Strings translated: 0/${totalStrings}`;
        };
        reader.readAsText(file);
    }
});
