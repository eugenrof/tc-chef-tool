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

/**
 * DOM ELEMENTS
 */
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
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
    themeToggle.innerText = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
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

    generateBtn.disabled = charCount === 0;
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
 * API KEY MANAGEMENT (With Corrected Validation)
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

    if (savedStory) {
        storyInput.value = savedStory;
        updateCharCount();
    }

    if (savedData) {
        try {
            generatedData = JSON.parse(savedData);
            renderTable(generatedData);
            downloadBtn.disabled = false;
        } catch (e) {
            console.error("Persistence error:", e);
        }
    }
});

storyInput.addEventListener('input', () => {
    localStorage.setItem('qa_story', storyInput.value);
    updateCharCount();
});

/**
 * TC CHEF GENERATION LOGIC
 */
async function cookTestCases() {
    const activeKey = getActiveApiKey();

    if (!activeKey) {
        alert("Chef needs an API Key to start the stove!");
        return;
    }

    if (!storyInput.value.trim()) {
        alert("Please enter a User Story first.");
        return;
    }

    storyInput.style.opacity = "0.5";
    generateBtn.disabled = true;
    generateBtn.innerText = "Heating up the kitchen...";

    // DYNAMIC LOADING MESSAGES
    resultsTable.innerHTML = `
        <div class="spinner-container" style="margin-top: 2.5rem;">
            <div class="spinner"></div>
            <p id="loadingMsg" class="loading-text" style="font-weight: 600; color: var(--primary-accent);">
                Gathering ingredients...
            </p>
        </div>`;

    const loadingMsg = document.getElementById('loadingMsg');
    const messages = ["Gathering ingredients...", "Preparing the TC Soup...", "Simmering with GenAI..."];
    let msgIdx = 0;

    const cookingInterval = setInterval(() => {
        if (loadingMsg) {
            msgIdx = (msgIdx + 1) % messages.length;
            loadingMsg.innerText = messages[msgIdx];
        }
    }, 2500);

    try {
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel(
            { model: "gemini-2.5-flash" },
            { apiVersion: 'v1' }
        );

        const prompt = `
            Context: You are "TC Chef", a Senior QA Engineer.
            Task: Decompose the following requirements into high-quality test cases.
            Format: Return a JSON array where each object has:
            - "id": String (e.g., TC-01)
            - "title": String (Descriptive title)
            - "checks": Array of objects with "step" and "expected_result" strings.
            
            Return ONLY raw JSON. Do not wrap in markdown tags.
            User Story: ${storyInput.value}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        generatedData = JSON.parse(cleanedJson);
        localStorage.setItem('qa_generated_data', JSON.stringify(generatedData));

        renderTable(generatedData);
        downloadBtn.disabled = false;

    } catch (error: any) {
        clearInterval(cookingInterval);
        console.error("Kitchen Error:", error);

        let friendlyHeader = "The kitchen is closed";
        let friendlyMessage = error.message;

        // FRIENDLIER QUOTA ERROR (429)
        if (error.message.includes("429") || error.message.toLowerCase().includes("quota")) {
            friendlyHeader = "⏳ Daily Limit Reached (Resets Tomorrow)";
            friendlyMessage = `
                TC Chef has finished all free orders for today.<br><br>
                • <strong>Wait:</strong> The kitchen reopens in 24 hours.<br>
                • <strong>Personal Key:</strong> Add your own key at <a href="https://aistudio.google.com/" target="_blank" style="color: var(--primary-accent); text-decoration: underline;">AI Studio</a> for a higher personal allowance.
            `;
        }

        resultsTable.innerHTML = `
            <div class="error-container" style="
                margin-top: 2.5rem; 
                color: #ff8888; 
                padding: 2rem; 
                text-align: center; 
                border: 1px solid var(--border-color); 
                border-radius: 12px; 
                background: rgba(255,0,0,0.05);
                overflow-wrap: break-word;
            ">
                <strong style="display: block; margin-bottom: 0.8rem; font-size: 1.1rem;">${friendlyHeader}</strong>
                <div style="font-size: 0.9rem; line-height: 1.6; opacity: 0.9;">${friendlyMessage}</div>
            </div>`;
    } finally {
        clearInterval(cookingInterval);
        storyInput.style.opacity = "1";
        generateBtn.disabled = false;
        generateBtn.innerText = "Cook Test Cases";
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

/**
 * UTILITIES
 */
function resetPage() {
    if (confirm("Clear the prep table? This will toss out your current User Story and all cooked test cases, but your API key will be kept on the shelf.")) {
        localStorage.removeItem('qa_story');
        localStorage.removeItem('qa_generated_data');
        storyInput.value = "";
        resultsTable.innerHTML = "";
        generatedData = [];
        downloadBtn.disabled = true;
        updateCharCount();
    }
}

function downloadCSV() {
    if (generatedData.length === 0) return;
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
    link.download = `TC_AI_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast("✓ CSV Export successful!");
}

/**
 * EVENT LISTENERS
 */
generateBtn.addEventListener('click', cookTestCases);
downloadBtn.addEventListener('click', downloadCSV);
resetBtn.addEventListener('click', resetPage);
