# 🧑‍🍳 TC Chef Tool

**TC Chef Tool** is a specialized AI-powered utility that transforms raw User Stories into professional, structured Test Cases. Designed for QA Engineers and Product Owners, it automates the tedious part of test documentation while ensuring deep coverage of edge cases.

[![GitHub Pages](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=github)](https://eugenrof.github.io/tc-chef-tool)


---

## 🏗️ Architecture & Engineering

This project was built to demonstrate a modern, high-performance web development workflow.

### ⚡ Built with Vite
I chose **Vite** as the build tool to move away from traditional, heavy-weight bundlers.
- **Native ESM Support:** Leverages modern browser capabilities to serve code instantly during development.
- **Optimized Build Pipeline:** Uses Rollup under the hood to create a highly minified, "tree-shaken" production bundle.
- **Asset Management:** Automatically handles the complex pathing required for GitHub Pages sub-directories.

### 🛡️ Type-Safety with TypeScript
The application logic is written entirely in **TypeScript**. 
- **Predictable Data:** Defined interfaces for User Stories and Test Case outputs ensure the AI's response is parsed correctly.
- **Maintainability:** Makes the codebase easier to scale if new features (like CSV exports) are added.

### 🤖 AI Integration
The tool communicates with the **Google Gemini API** via the `@google/generative-ai` SDK.
- **Client-Side Processing:** All AI requests are handled directly from the browser to the API, reducing infrastructure costs.
- **Instruction Engineering:** The underlying logic provides the AI with specific context to ensure output follows strict QA standards.

### 🔑 Why a Gemini API Key?

This tool is designed as a **Client-Side Only** application. This architecture was chosen for several important reasons:

- **Security & Privacy:** Your API key and User Stories never pass through a middleman server. They are sent directly from your browser to Google’s Gemini API.
- **Data Persistence:** The API key is stored securely in your browser's `localStorage`. This means you only have to enter it once, and it will be there the next time you visit.
- **Cost-Free Hosting:** By using a client-side model, the app can be hosted for free on GitHub Pages without needing an expensive backend server to process AI requests.
- **Ownership:** You have full control over your usage limits and quotas via the [Google AI Studio console](https://aistudio.google.com/).

### 🛠️ How to get your key:
1. Visit **[Google AI Studio](https://aistudio.google.com/)**.
2. Click on **"Get API key"**.
3. Create a new key in a new project.
4. Paste it into the **Settings** field of the TC Chef Tool.


## 📂 Project Structure

```text
tc-chef-tool/
├── public/                # Static assets (copied to dist as-is)
│   └── images/            # Social preview and UI images
│       └── tc_chef.png
├── src/                   # Application source code
│   ├── main.ts            # Entry point and AI logic
│   └── style.css          # Application styling
├── index.html             # Main entry page & Meta tags
├── package.json           # Scripts and dependencies
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration (Base paths & plugins)
 ```

## ⚖️ License & Credits 
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📝 About the Author
I am a **Senior QA Engineer** and a certified **Professional Scrum Master (PSM I & PSM II)**, with a passion for testing & building tools that enhance team agility and transparency.

---
*Making QA testing more efficient through AI.*

Developed by **Eugen Rof** (2026)
