//@ts-nocheck
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * CONFIGURATION & API HANDLING
 */
const SHARED_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const CHAR_LIMIT = 2500;

function getActiveApiKey() {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    return savedKey || SHARED_API_KEY;
}

let generatedData: any[] = [];
let isGherkinMode = false;

/**
 * DOM ELEMENTS
 */
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const generateGherkinBtn = document.getElementById('generateGherkinBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
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
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--toggle-bg);
        color: var(--toggle-text);
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 0.9rem;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
    `;

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

        setTimeout(() => {
            copyBtn.classList.remove('copy-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
});

/**
 * API KEY VISIBILITY TOGGLE
 */
toggleVisibilityBtn.addEventListener('click', () => {
    const isPassword = userApiKeyInput.type === 'password';
    userApiKeyInput.type = isPassword ? 'text' : 'password';

    if (isPassword) {
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>`;
        toggleVisibilityBtn.style.color = "var(--primary-accent)";
    } else {
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>`;
        toggleVisibilityBtn.style.color = "var(--sub-text)";
    }
});

/**
 * API KEY MANAGEMENT
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
        setTimeout(() => {
            keyStatus.innerText = "";
            userApiKeyInput.style.borderColor = "var(--border-color)";
        }, 5000);
    }
});

/**
 * INITIALIZATION & PERSISTENCE
 */
window.addEventListener('DOMContentLoaded', () => {
    storyInput.setAttribute('maxlength', CHAR_LIMIT.toString());

    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) userApiKeyInput.value = savedKey;

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
            if (isGherkinMode) {
                renderGherkin(generatedData);
                downloadBtn.innerText = "Download .feature";
            } else {
                renderTable(generatedData);
                downloadBtn.innerText = "Download CSV";
            }
            downloadBtn.disabled = false;
        } catch (e) {
            console.error("Persistence error:", e);
        }
    }
});

/**
 * REFRESH HANDLING: Stop the generation process on refresh/close
 */
window.addEventListener('beforeunload', () => {
    localStorage.removeItem('qa_generated_data');
    localStorage.removeItem('qa_mode');
});

storyInput.addEventListener('input', () => {
    localStorage.setItem('qa_story', storyInput.value);
    updateCharCount();
});

/**
 * TC CHEF GENERATION LOGIC
 */
async function cookTestCases(mode: 'table' | 'gherkin' = 'table') {
    const activeKey = getActiveApiKey();
    isGherkinMode = mode === 'gherkin';

    if (!activeKey) {
        alert("Chef needs an API Key to start the stove!");
        return;
    }

    if (!storyInput.value.trim()) {
        alert("Please enter a User Story first.");
        return;
    }

    // UPDATE DOWNLOAD BUTTON TEXT IMMEDIATELY BASED ON MODE
    downloadBtn.innerText = isGherkinMode ? "Download .feature" : "Download CSV";

    storyInput.style.opacity = "0.5";
    generateBtn.disabled = true;
    generateGherkinBtn.disabled = true;

    const originalBtnText = isGherkinMode ? "Cook Gherkin (BDD)" : "Cook Test Cases";
    const loadingBtnText = isGherkinMode ? "Cooking BDD Script(s)..." : "Heating up the kitchen...";

    if (isGherkinMode) generateGherkinBtn.innerText = loadingBtnText;
    else generateBtn.innerText = loadingBtnText;

    // Enhanced Loading UI
    resultsTable.innerHTML = `
        <div class="spinner-container" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 3rem;">
            <div class="spinner"></div>
            <div id="loadingStatus" style="text-align: center; animation: pulse 2s infinite ease-in-out;">
                <p id="loadingMsg" style="font-weight: 700; color: var(--primary-accent); font-size: 1.2rem; margin: 0;">Gathering ingredients...</p>
                <p style="font-size: 0.85rem; color: var(--sub-text); margin-top: 0.4rem;">The AI kitchen is prepping your tests</p>
            </div>
        </div>`;

    const loadingMsg = document.getElementById('loadingMsg');
    const messages = ["Gathering ingredients...", "Preparing the TC Soup...", "Simmering with GenAI...", "Plating the results..."];
    let msgIdx = 0;

    const cookingInterval = setInterval(() => {
        if (loadingMsg) {
            msgIdx = (msgIdx + 1) % messages.length;
            loadingMsg.innerText = messages[msgIdx];
        }
    }, 2500);

    try {
        const genAI = new GoogleGenerativeAI(activeKey);

        // This is the current most-reliable string for AI Studio Free Tier
        const model = genAI.getGenerativeModel(
            { model: "gemini-2.5-flash-lite" },
            { apiVersion: 'v1' }
        );

        const prompt = isGherkinMode ?
            `Context: You are a Senior QA Automation Engineer.
         Task: Convert the following User Story into Gherkin BDD format.
         Include: Feature name, Background (if applicable), and multiple Scenarios (Happy Path, Negative Path, Edge Cases).
         Format: Return a JSON array of strings, where each string is a block of Gherkin code for one scenario.
         Example: ["Feature: Login\\nScenario: Valid Login...", "Scenario: Invalid Password..."]
         Return ONLY raw JSON. No markdown.
         User Story: ${storyInput.value}`
            :
            `Context: You are "TC Chef", a Senior QA Engineer.
         Task: Decompose the following requirements into high-quality manual test cases.
         Format: Return a JSON array where each object has:
         - "id": String (e.g., TC-01)
         - "title": String (Descriptive title)
         - "checks": Array of objects with "step" and "expected_result" strings.
         Return ONLY raw JSON. No markdown.
         User Story: ${storyInput.value}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        generatedData = JSON.parse(cleanedJson);

        // SAVE TO STORAGE ONLY AFTER SUCCESS
        localStorage.setItem('qa_generated_data', JSON.stringify(generatedData));
        localStorage.setItem('qa_mode', mode);

        if (isGherkinMode) {
            renderGherkin(generatedData);
            // Redundant safety update
            downloadBtn.innerText = "Download .feature";
        } else {
            renderTable(generatedData);
            // Redundant safety update
            downloadBtn.innerText = "Download CSV";
        }
        downloadBtn.disabled = false;

    } catch (error: any) {
        clearInterval(cookingInterval);
        const isBusy = error.message.includes("503") || error.message.includes("demand");

        resultsTable.innerHTML = `
            <div style="background: rgba(255, 136, 136, 0.1); border: 1px solid #ff8888; border-radius: 12px; padding: 2rem; text-align: center; margin-top: 2rem;">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">${isBusy ? '👨‍🍳 💨' : '⚠️'}</div>
                <h3 style="color: #ff8888; margin-bottom: 0.5rem;">${isBusy ? 'Kitchen is Overloaded' : 'Cooking Error'}</h3>
                <p style="color: var(--text-color); font-size: 0.95rem; max-width: 420px; margin: 0 auto 1.5rem auto; line-height: 1.5;">
                    ${isBusy ? 'Google\'s Gemini 2.5 model is currently experiencing high demand. Please wait a few seconds and try clicking "Cook" again.' : error.message}
                </p>
                ${isBusy ? '<button onclick="window.location.reload()" style="background: var(--primary-accent); color: white; border: none; padding: 10px 24px; border-radius: 20px; cursor: pointer; font-weight: 600; transition: opacity 0.2s;">Refresh Page</button>' : ''}
            </div>`;
    } finally {
        clearInterval(cookingInterval);
        storyInput.style.opacity = "1";
        generateBtn.disabled = false;
        generateGherkinBtn.disabled = false;
        generateBtn.innerText = "Cook Test Cases";
        generateGherkinBtn.innerText = "Cook Gherkin (BDD)";
        updateCharCount();
    }
}

/**
 * UI RENDERING
 */
function renderTable(data: any[]) {
    let html = `
        <div style="overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color); margin-top: 2.5rem;">
        <table style="width: 100%; border-collapse: collapse; background: var(--table-row-bg);">
            <thead>
                <tr style="background: var(--table-header-bg); border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 1rem; text-align: left; color: var(--header-text);">Test Case Info</th>
                    <th style="padding: 1rem; text-align: left; color: var(--header-text);">Verification Steps</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((tc, index) => {
        const steps = tc.checks || [];
        let checksHtml = steps.map((c, i) => `
            <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                <div style="font-size: 0.95rem; margin-bottom: 0.2rem;"><strong>${i + 1}. Step:</strong> ${c.step ?? 'N/A'}</div>
                <div style="font-size: 0.95rem; color: var(--btn-green);"><strong>➔ Expected:</strong> ${c.expected_result ?? 'N/A'}</div>
            </div>
        `).join('');

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1.5rem; vertical-align: top; width: 30%;">
                    <span style="font-size: 0.75rem; color: var(--primary-accent); font-weight: bold; text-transform: uppercase;">${tc.id ?? 'TC-' + (index + 1)}</span>
                    <div style="font-weight: 600; margin-top: 0.5rem; line-height: 1.4; color: var(--header-text);">${tc.title ?? 'Untitled TC'}</div>
                </td>
                <td style="padding: 1.5rem; vertical-align: top;">
                    ${checksHtml || '<em>No ingredients found for this case.</em>'}
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    resultsTable.innerHTML = html;
}

function renderGherkin(data: string[]) {
    let html = `<div style="margin-top: 2.5rem;">`;
    data.forEach(block => {
        html += `
            <pre style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); color: var(--text-color); font-family: monospace; overflow-x: auto; margin-bottom: 1rem; white-space: pre-wrap; position: relative;">
                <code style="color: var(--primary-accent); font-weight: bold;">${block}</code>
            </pre>`;
    });
    html += `</div>`;
    resultsTable.innerHTML = html;
}

/**
 * UTILITIES
 */
function resetPage() {
    if (confirm("Clear the prep table?")) {
        localStorage.removeItem('qa_story');
        localStorage.removeItem('qa_generated_data');
        localStorage.removeItem('qa_mode');
        storyInput.value = "";
        resultsTable.innerHTML = "";
        generatedData = [];
        downloadBtn.disabled = true;
        downloadBtn.innerText = "Download Results";
        updateCharCount();
    }
}

/**
 * HYBRID DOWNLOAD LOGIC (Handles CSV and .feature)
 */
function downloadResults() {
    if (generatedData.length === 0) return;

    if (isGherkinMode) {
        const gherkinText = generatedData.join('\n\n');
        const blob = new Blob([gherkinText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TC_Chef_BDD_${new Date().toISOString().split('T')[0]}.feature`;
        link.click();
        showToast("✓ .feature file exported!");
    } else {
        const headers = ["TCID", "Title", "Step Number", "Action", "Expected Result"];
        const csvContent = generatedData.flatMap(tc =>
            (tc.checks || []).map((c, i) => [
                `"${(tc.id ?? 'N/A').toString().replace(/"/g, '""')}"`,
                `"${(tc.title ?? '').replace(/"/g, '""')}"`,
                i + 1,
                `"${(c.step ?? '').replace(/"/g, '""')}"`,
                `"${(c.expected_result ?? '').replace(/"/g, '""')}"`
            ].join(","))
        );

        const blob = new Blob([[headers.join(","), ...csvContent].join("\n")], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TC_Chef_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        showToast("✓ CSV Export successful!");
    }
}

/**
 * EVENT LISTENERS
 */
generateBtn.addEventListener('click', () => cookTestCases('table'));
generateGherkinBtn.addEventListener('click', () => cookTestCases('gherkin'));
downloadBtn.addEventListener('click', downloadResults);
resetBtn.addEventListener('click', resetPage);