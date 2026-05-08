//@ts-nocheck
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { jsPDF } from "jspdf";

/**
 * CONFIGURATION & API HANDLING
 */
const SHARED_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CHAR_LIMIT = 2500;
let currentProvider = 'gemini'; // Tracks the active AI engine

function getActiveApiKey() {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    return savedKey || SHARED_API_KEY;
}

function getOpenAIKey() {
    return localStorage.getItem('user_openai_api_key') || '';
}

function getAwsCredentials() {
    return {
        accessKeyId: localStorage.getItem('aws_access_key') || '',
        secretAccessKey: localStorage.getItem('aws_secret_key') || '',
        region: localStorage.getItem('aws_region') || 'us-east-1'
    };
}

let generatedData: any[] = [];
let isGherkinMode = false;

/**
 * DOM ELEMENTS
 */
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const generateGherkinBtn = document.getElementById('generateGherkinBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
const downloadPdfBtn = document.getElementById('downloadPdfBtn') as HTMLButtonElement;
const pdfExportContainer = document.getElementById('pdfExportContainer') as HTMLDivElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
const toggleVisibilityBtn = document.getElementById('toggleVisibility') as HTMLDivElement;
const eyeIcon = document.getElementById('eyeIcon');
const storyInput = document.getElementById('storyInput') as HTMLTextAreaElement;
const resultsTable = document.getElementById('resultsTable') as HTMLDivElement;
const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const userApiKeyInput = document.getElementById('userApiKey') as HTMLInputElement;
const saveKeyBtn = document.getElementById('saveKeyBtn') as HTMLButtonElement;
const keyStatus = document.getElementById('keyStatus') as HTMLParagraphElement;
const wordCounter = document.getElementById('wordCounter') as HTMLDivElement;

// Pantries
const geminiPantry = document.getElementById('geminiPantry') as HTMLDivElement;
const awsPantry = document.getElementById('awsPantry') as HTMLDivElement;
const openaiPantry = document.getElementById('openaiPantry') as HTMLDivElement;

// AWS Elements
const awsAccessKeyInput = document.getElementById('awsAccessKey') as HTMLInputElement;
const awsSecretKeyInput = document.getElementById('awsSecretKey') as HTMLInputElement;
const awsRegionInput = document.getElementById('awsRegion') as HTMLInputElement;
const saveAwsKeyBtn = document.getElementById('saveAwsKeyBtn') as HTMLButtonElement;

// OpenAI Elements
const openaiApiKeyInput = document.getElementById('openaiApiKey') as HTMLInputElement;
const saveOpenAIKeyBtn = document.getElementById('saveOpenAIKeyBtn') as HTMLButtonElement;

/**
 * PROVIDER SWITCHER LOGIC
 */
document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentProvider = (e.target as HTMLInputElement).value;
        if (geminiPantry && awsPantry && openaiPantry) {
            geminiPantry.style.display = currentProvider === 'gemini' ? 'block' : 'none';
            awsPantry.style.display = currentProvider === 'aws' ? 'block' : 'none';
            openaiPantry.style.display = currentProvider === 'openai' ? 'block' : 'none';
        }
    });
});

/**
 * THEME LOGIC
 */
const currentTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', currentTheme);
updateThemeButton(currentTheme);

themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
});

function updateThemeButton(theme: string) {
    const iconEl = themeToggle.querySelector('.theme-icon');
    const textEl = themeToggle.querySelector('.theme-text');
    if (iconEl && textEl) {
        iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
        textEl.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    } else {
        themeToggle.innerText = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

/**
 * CHARACTER COUNTER & INPUT LOCK
 */
function updateCharCount() {
    const charCount = storyInput.value.length;
    wordCounter.innerText = `${charCount} / ${CHAR_LIMIT}`;
    if (charCount >= CHAR_LIMIT) {
        wordCounter.classList.add('limit-reached');
    } else {
        wordCounter.classList.remove('limit-reached');
    }
    const isEmpty = charCount === 0;
    generateBtn.disabled = isEmpty;
    generateGherkinBtn.disabled = isEmpty;
}

/**
 * NOTIFICATION HELPER
 */
function showToast(message: string) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: var(--toggle-bg); color: var(--toggle-text); padding: 12px 24px; border-radius: 30px; font-size: 0.9rem; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1000; opacity: 0; transition: opacity 0.3s, transform 0.3s;`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(-10px)";
    }, 10);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

/**
 * COPY TO CLIPBOARD LOGIC
 */
copyBtn.addEventListener('click', async () => {
    const text = storyInput.value.trim();
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add('copy-success');
        showToast("✓ Text copied to clipboard!");
        setTimeout(() => copyBtn.classList.remove('copy-success'), 2000);
    } catch (err) { console.error('Failed to copy: ', err); }
});

/**
 * API KEY VISIBILITY TOGGLE
 */
toggleVisibilityBtn.addEventListener('click', () => {
    const isPassword = userApiKeyInput.type === 'password';
    userApiKeyInput.type = isPassword ? 'text' : 'password';
    if (isPassword) {
        eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
        toggleVisibilityBtn.style.color = "var(--primary-accent)";
    } else {
        eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
        toggleVisibilityBtn.style.color = "var(--sub-text)";
    }
});

/**
 * API KEY MANAGEMENT (GEMINI)
 */
saveKeyBtn.addEventListener('click', async () => {
    const key = userApiKeyInput.value.trim();
    if (!key) {
        localStorage.removeItem('user_gemini_api_key');
        keyStatus.innerText = "ℹ️ Personal key removed. Using Shared Key.";
        keyStatus.style.color = "var(--sub-text)";
        userApiKeyInput.style.borderColor = "var(--border-color)";
        setTimeout(() => { keyStatus.innerText = ""; }, 4000);
        return;
    }
    saveKeyBtn.disabled = true;
    saveKeyBtn.innerText = "Checking...";
    keyStatus.innerText = "⏳ Validating key with Google...";
    keyStatus.style.color = "var(--primary-accent)";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        if (response.ok) {
            localStorage.setItem('user_gemini_api_key', key);
            keyStatus.innerText = "✅ Personal Key is Valid and Active!";
            keyStatus.style.color = "#28a745";
            keyStatus.style.fontWeight = "600";
            userApiKeyInput.style.borderColor = "#28a745";
        } else {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Invalid API Key");
        }
    } catch (error: any) {
        keyStatus.innerText = `❌ Invalid Key: ${error.message}`;
        keyStatus.style.color = "#ff8888";
        userApiKeyInput.style.borderColor = "#ff8888";
    } finally {
        saveKeyBtn.disabled = false;
        saveKeyBtn.innerText = "Save Key";
        setTimeout(() => { keyStatus.innerText = ""; userApiKeyInput.style.borderColor = "var(--border-color)"; }, 5000);
    }
});

/**
 * OPENAI KEY MANAGEMENT
 */
saveOpenAIKeyBtn?.addEventListener('click', () => {
    const key = openaiApiKeyInput.value.trim();
    if (!key) {
        localStorage.removeItem('user_openai_api_key');
        showToast("ℹ️ OpenAI key removed.");
        return;
    }
    localStorage.setItem('user_openai_api_key', key);
    showToast("✅ OpenAI Key saved locally");
});

/**
 * AWS KEY MANAGEMENT
 */
saveAwsKeyBtn?.addEventListener('click', () => {
    const acc = awsAccessKeyInput.value.trim();
    const sec = awsSecretKeyInput.value.trim();
    const reg = awsRegionInput.value.trim() || 'us-east-1';

    if (!acc || !sec) {
        showToast("⚠️ Provide Access and Secret keys");
        return;
    }
    localStorage.setItem('aws_access_key', acc);
    localStorage.setItem('aws_secret_key', sec);
    localStorage.setItem('aws_region', reg);
    showToast("✅ AWS Credentials saved locally");
});

/**
 * INITIALIZATION & PERSISTENCE
 */
window.addEventListener('DOMContentLoaded', () => {
    storyInput.setAttribute('maxlength', CHAR_LIMIT.toString());

    const savedGeminiKey = localStorage.getItem('user_gemini_api_key');
    if (savedGeminiKey) userApiKeyInput.value = savedGeminiKey;

    const savedOpenAIKey = localStorage.getItem('user_openai_api_key');
    if (savedOpenAIKey) openaiApiKeyInput.value = savedOpenAIKey;

    const savedAwsKey = localStorage.getItem('aws_access_key');
    if (savedAwsKey && awsAccessKeyInput) awsAccessKeyInput.value = savedAwsKey;

    const savedStory = localStorage.getItem('qa_story');
    const savedData = localStorage.getItem('qa_generated_data');
    const savedMode = localStorage.getItem('qa_mode');

    if (savedStory) {
        storyInput.value = savedStory;
        updateCharCount();
    }
    if (savedData) {
        try {
            isGherkinMode = savedMode === 'gherkin';
            generatedData = JSON.parse(savedData);
            if (isGherkinMode) renderGherkin(generatedData);
            else renderTable(generatedData);
            downloadBtn.disabled = false;
            pdfExportContainer.style.display = "flex";
        } catch (e) { console.error("Persistence error:", e); }
    }
});

window.addEventListener('beforeunload', () => {
    localStorage.removeItem('qa_generated_data');
    localStorage.removeItem('qa_mode');
});

storyInput.addEventListener('input', () => {
    localStorage.setItem('qa_story', storyInput.value);
    updateCharCount();
});

/**
 * PROVIDER SPECIFIC CALLS
 */
async function cookWithOpenAI(prompt: string, apiKey: string) {
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a Senior QA Engineer. Create professional test cases in JSON." },
            { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
    });

    return completion.choices[0].message.content;
}

/**
 * TC CHEF GENERATION LOGIC
 */
async function cookTestCases(mode: 'table' | 'gherkin' = 'table') {
    isGherkinMode = mode === 'gherkin';

    if (currentProvider === 'gemini' && !getActiveApiKey()) {
        alert("Chef needs a Gemini Key!"); return;
    }
    if (currentProvider === 'openai' && !getOpenAIKey()) {
        alert("Chef needs an OpenAI Key!"); return;
    }
    if (currentProvider === 'aws' && (!localStorage.getItem('aws_access_key'))) {
        alert("Chef needs AWS Credentials!"); return;
    }
    if (!storyInput.value.trim()) {
        alert("Please enter a User Story first."); return;
    }

    downloadBtn.innerText = isGherkinMode ? "Download .feature" : "Download CSV";
    pdfExportContainer.style.display = "none";
    storyInput.style.opacity = "0.5";
    generateBtn.disabled = true;
    generateGherkinBtn.disabled = true;

    resultsTable.innerHTML = `
        <div class="spinner-container" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem;">
            <div class="spinner"></div>
            <div id="loadingStatus" style="text-align: center; animation: pulse 2s infinite ease-in-out;">
                <p id="loadingMsg" style="font-weight: 700; color: var(--primary-accent); font-size: 1.2rem; margin: 0;">Gathering ingredients...</p>
                <p style="font-size: 0.85rem; color: var(--sub-text); margin-top: 0.4rem;">Cooking with ${currentProvider === 'gemini' ? 'Gemini 2.5' : currentProvider === 'openai' ? 'ChatGPT (GPT-4o)' : 'Amazon Q (Bedrock)'}</p>
            </div>
        </div>`;

    const loadingMsg = document.getElementById('loadingMsg');
    const messages = ["Gathering ingredients...", "Preparing the TC Soup...", "Simmering with AI...", "Plating the results..."];
    let msgIdx = 0;
    const cookingInterval = setInterval(() => {
        if (loadingMsg) {
            msgIdx = (msgIdx + 1) % messages.length;
            loadingMsg.innerText = messages[msgIdx];
        }
    }, 2500);

    try {
        let text = "";
        const prompt = isGherkinMode ?
            `Context: Senior QA Automation Engineer. Task: Convert User Story into Gherkin BDD. Return ONLY raw JSON. Format: JSON array of strings OR a JSON object with "feature", "background", and "scenarios" (array of {name, steps[]}). User Story: ${storyInput.value}`
            :
            `Context: TC Chef, Senior QA Engineer. Task: Decompose requirement into manual test cases. Format: Return JSON array where each object has "id", "title", and "checks" (step/expected_result). User Story: ${storyInput.value}`;

        if (currentProvider === 'gemini') {
            const genAI = new GoogleGenerativeAI(getActiveApiKey());
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }, { apiVersion: 'v1' });
            const result = await model.generateContent(prompt);
            text = result.response.text();
        } else if (currentProvider === 'openai') {
            text = await cookWithOpenAI(prompt, getOpenAIKey());
        } else {
            const creds = getAwsCredentials();
            const client = new BedrockRuntimeClient({
                region: creds.region,
                credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey }
            });
            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 2500,
                    messages: [{ role: "user", content: prompt }]
                })
            });
            const response = await client.send(command);
            const decoded = JSON.parse(new TextDecoder().decode(response.body));
            text = decoded.content[0].text;
        }

        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const rawData = JSON.parse(cleanedJson);

        // Handle case where OpenAI/Gemini might wrap the array in a "test_cases" or similar key
        let finalData = rawData;
        if (!Array.isArray(rawData) && rawData.test_cases) finalData = rawData.test_cases;
        if (!Array.isArray(rawData) && rawData.scenarios && isGherkinMode) finalData = rawData;

        if (isGherkinMode) {
            if (!Array.isArray(finalData) && typeof finalData === 'object') {
                let parts = [];
                if (finalData.feature) parts.push(`Feature: ${finalData.feature}`);
                if (finalData.description) parts.push(finalData.description);
                if (finalData.background) parts.push(`Background:\n  ${finalData.background}`);
                if (Array.isArray(finalData.scenarios)) {
                    finalData.scenarios.forEach((s: any) => {
                        let scenarioText = `Scenario: ${s.name || 'Test Scenario'}\n`;
                        if (Array.isArray(s.steps)) scenarioText += s.steps.map(step => `  ${step}`).join('\n');
                        parts.push(scenarioText);
                    });
                }
                generatedData = parts;
            } else {
                generatedData = finalData.map((item: any) => typeof item === 'string' ? item : (item.gherkin || JSON.stringify(item)));
            }
        } else {
            generatedData = Array.isArray(finalData) ? finalData : [finalData];
        }

        localStorage.setItem('qa_generated_data', JSON.stringify(generatedData));
        localStorage.setItem('qa_mode', mode);

        if (isGherkinMode) renderGherkin(generatedData);
        else renderTable(generatedData);

        downloadBtn.disabled = false;
        pdfExportContainer.style.display = "flex";

    } catch (error: any) {
        clearInterval(cookingInterval);
        resultsTable.innerHTML = `<div style="color:#ff8888; text-align:center; padding:2rem;">Cooking Error: ${error.message}</div>`;
    } finally {
        clearInterval(cookingInterval);
        storyInput.style.opacity = "1";
        generateBtn.disabled = false;
        generateGherkinBtn.disabled = false;
        updateCharCount();
    }
}

/**
 * UI RENDERING
 */
function renderTable(data: any[]) {
    let html = `<div style="overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color); margin-top: 2.5rem;"><table style="width: 100%; border-collapse: collapse; background: var(--table-row-bg);"><thead><tr style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);"><th style="padding: 1rem; text-align: left; color: var(--header-text);">Test Case Info</th><th style="padding: 1rem; text-align: left; color: var(--header-text);">Verification Steps</th></tr></thead><tbody>`;
    data.forEach((tc, index) => {
        const steps = tc.checks || [];
        let checksHtml = steps.map((c, i) => `<div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"><div style="font-size: 0.95rem; margin-bottom: 0.2rem;"><strong>${i + 1}. Step:</strong> ${c.step ?? 'N/A'}</div><div style="font-size: 0.95rem; color: var(--btn-green);"><strong>➔ Expected:</strong> ${c.expected_result ?? 'N/A'}</div></div>`).join('');
        html += `<tr style="border-bottom: 1px solid var(--border-color);"><td style="padding: 1.5rem; vertical-align: top; width: 30%;"><span style="font-size: 0.75rem; color: var(--primary-accent); font-weight: bold; text-transform: uppercase;">${tc.id ?? 'TC-' + (index + 1)}</span><div style="font-weight: 600; margin-top: 0.5rem; line-height: 1.4; color: var(--header-text);">${tc.title ?? 'Untitled TC'}</div></td><td style="padding: 1.5rem; vertical-align: top;">${checksHtml || '<em>No ingredients found.</em>'}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    resultsTable.innerHTML = html;
}

function renderGherkin(data: string[]) {
    const separator = `\n\n# ----------------------------------\n\n`;
    resultsTable.innerHTML = `<div class="gherkin-results-wrapper" style="margin-top: 2.5rem;"><div class="gherkin-block" style="background: var(--table-row-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 2rem;"><pre style="margin: 0; white-space: pre-wrap; font-family: 'Fira Code', monospace; color: var(--header-text); line-height: 1.6;"><code>${data.join(separator).trim()}</code></pre></div></div>`;
}

/**
 * EXPORT LOGIC
 */
function downloadPdf() {
    if (generatedData.length === 0) return;
    const doc = new jsPDF();
    const now = new Date();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("TC Chef | Test Plan", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated via ${currentProvider.toUpperCase()} on: ${now.toLocaleString()}`, 14, 28);
    doc.line(14, 32, 196, 32);

    let y = 45;
    if (isGherkinMode) {
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(generatedData.join('\n\n'), 180);
        lines.forEach(line => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(line, 14, y); y += 5;
        });
    } else {
        generatedData.forEach(tc => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(`${tc.id ?? 'TC'}: ${tc.title ?? 'Untitled'}`, 14, y);
            y += 7;
            doc.setFont("helvetica", "normal");
            (tc.checks || []).forEach(c => {
                const stepLines = doc.splitTextToSize(`- Step: ${c.step} | Exp: ${c.expected_result}`, 175);
                if (y + (stepLines.length * 5) > 285) { doc.addPage(); y = 20; }
                doc.text(stepLines, 18, y);
                y += (stepLines.length * 5) + 2;
            });
            y += 8;
        });
    }
    doc.save(`TC_Test_Plan_Report_${now.toISOString().split('T')[0]}.pdf`);
}

function downloadResults() {
    if (generatedData.length === 0) return;
    if (isGherkinMode) {
        const blob = new Blob([generatedData.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `TC_Plan_${new Date().toISOString().split('T')[0]}.feature`;
        link.click();
    } else {
        const headers = ["TCID", "Title", "Action", "Expected Result"];
        const csv = generatedData.flatMap(tc => (tc.checks || []).map(c => [`"${tc.id}"`, `"${tc.title}"`, `"${c.step}"`, `"${c.expected_result}"`].join(",")));
        const blob = new Blob([[headers.join(","), ...csv].join("\n")], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `TC_Chef_Export.csv`; link.click();
    }
    showToast("✓ File exported!");
}

function resetPage() {
    if (confirm("Clear the prep table?")) {
        localStorage.removeItem('qa_story');
        localStorage.removeItem('qa_generated_data');
        storyInput.value = ""; resultsTable.innerHTML = "";
        generatedData = []; downloadBtn.disabled = true;
        pdfExportContainer.style.display = "none";
        updateCharCount();
    }
}

/**
 * EVENT LISTENERS
 */
generateBtn.addEventListener('click', () => cookTestCases('table'));
generateGherkinBtn.addEventListener('click', () => cookTestCases('gherkin'));
downloadBtn.addEventListener('click', downloadResults);
downloadPdfBtn.addEventListener('click', downloadPdf);
resetBtn.addEventListener('click', resetPage);
