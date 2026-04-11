# CodeForge User Guide

## Table of Contents
1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [Creating a Playground](#4-creating-a-playground)
5. [The Playground IDE](#5-the-playground-ide)
   - [File Explorer](#51-file-explorer)
   - [Code Editor](#52-code-editor)
   - [Preview Panel](#53-preview-panel)
   - [Terminal](#54-terminal)
6. [AI Features](#6-ai-features)
   - [Code Suggestions](#61-code-suggestions)
   - [Explain Code](#62-explain-code)
   - [Debug Code](#63-debug-code)
   - [AI Chat Sidebar](#64-ai-chat-sidebar)
7. [GitHub Integration](#7-github-integration)
8. [Settings](#8-settings)
9. [Keyboard Shortcuts](#9-keyboard-shortcuts)

---

## 1. Introduction

CodeForge is a browser-based intelligent code editor and IDE. It lets you write, run, and debug code directly in your browser — no local setup required. It combines a full Monaco editor, a live WebContainer runtime, and AI-powered assistance to give you a complete development environment.

Key capabilities:
- Create and manage coding projects (playgrounds) from multiple starter templates
- Edit files with full syntax highlighting and tab management
- Run your project live in a built-in preview panel
- Use an integrated terminal powered by WebContainers
- Get AI code completions, explanations, and debugging help
- Push your code directly to GitHub

---

## 2. Getting Started

### Sign In

Navigate to the CodeForge home page and click **Get Started**. You will be redirected to the sign-in page.

You can sign in using:
- **Google** — standard OAuth login
- **GitHub** — OAuth login; also grants repository access for the GitHub push feature

> Note: Signing in with GitHub is required to use the GitHub Push feature. If you sign in with Google, you can still use all other features.

Once authenticated, you are redirected to your **Dashboard**.

---

## 3. Dashboard

The dashboard is your home base. It shows all your projects and gives you quick access to create new ones.

### What you'll see

- **Welcome header** — shows your first name and total project count
- **Project table** — lists all your playgrounds with their template type, creation date, and actions
- **Stats cards** — total projects, starred projects, and templates used

### Project Actions

Each project in the table has a context menu with the following options:

| Action | Description |
|---|---|
| Open | Opens the playground in the IDE |
| Edit | Rename or update the project description |
| Duplicate | Creates a copy of the project |
| Star / Unstar | Bookmarks the project for quick reference |
| Delete | Permanently deletes the project |

---

## 4. Creating a Playground

Click the **New Project** (or **+**) button on the dashboard.

A dialog will appear asking for:

- **Title** — the name of your project
- **Template** — the starter template to use
- **Description** (optional)

### Available Templates

| Template | Description |
|---|---|
| React | Vite + React + TypeScript |
| Next.js | Full-stack Next.js app |
| Express | Simple Node.js/Express server |
| Vue | Vue 3 starter |
| Hono | Lightweight Hono web framework |
| Angular | Angular starter project |

After clicking **Create**, you are taken directly into the playground IDE.

---

## 5. The Playground IDE

The IDE is split into four main areas:

```
┌─────────────────────────────────────────────────────┐
│                    Header Bar                        │
├──────────────┬──────────────────────┬───────────────┤
│              │                      │               │
│    File      │    Code Editor       │   Preview     │
│  Explorer   │    (Monaco)          │   Panel       │
│              │                      │               │
├──────────────┴──────────────────────┴───────────────┤
│                    Terminal                          │
└─────────────────────────────────────────────────────┘
```

### Header Bar

The header bar contains the following controls:

- **Back arrow** — returns to the dashboard
- **Project title** — displays the current project name
- **Unsaved indicator** — a dot appears when you have unsaved changes
- **Save** — saves the currently active file
- **Save All** — saves all open files
- **Close All** — closes all open editor tabs
- **Run** — mounts your project into the WebContainer and starts the dev server
- **Refresh** — restarts the running server
- **Toggle Preview** — shows or hides the live preview panel
- **Auto Save toggle** — enables automatic saving on a timer
- **AI toggle** — enables or disables AI features
- **AI Settings** — configure which AI features are active
- **GitHub Push** — opens the GitHub push modal
- **Settings** — navigates to the settings page

---

### 5.1 File Explorer

The file explorer is the left sidebar. It shows your project's file tree.

**Actions available:**

| Icon | Action |
|---|---|
| File+ | Create a new file in the current folder |
| Folder+ | Create a new folder |
| Refresh | Refresh and expand the tree |
| Collapse | Collapse all folders |

**Right-click or hover on any file/folder** to access:
- Rename
- Delete

**Clicking a file** opens it in the editor as a new tab.

File types are color-coded with short labels:
- `TS` — TypeScript (blue)
- `TX` — TSX (light blue)
- `JS` — JavaScript (yellow)
- `JX` — JSX (light yellow)
- `{}` — JSON
- `CS` — CSS/SCSS (purple)
- `HT` — HTML (orange)
- `MD` — Markdown (gray)
- `SV` — SVG (green)

---

### 5.2 Code Editor

The editor is powered by **Monaco Editor** (the same engine as VS Code).

**Tab bar** — open files appear as tabs at the top. A dot on a tab indicates unsaved changes. Click the `×` on a tab to close it.

**Editing** — full syntax highlighting, bracket matching, and IntelliSense are available for all supported file types.

**Saving** — press `Ctrl+S` (or `Cmd+S` on Mac) to save the active file. Changes are synced live to the WebContainer if it is running.

**Auto Save** — toggle Auto Save from the header to have files saved automatically after a short delay.

---

### 5.3 Preview Panel

The preview panel shows your running application in a live iframe.

1. Click **Run** in the header to start the dev server inside the WebContainer.
2. Once the server is ready, the preview panel loads your app automatically.
3. Use **Refresh** to restart the server if needed.
4. Toggle the preview panel visibility using the **Toggle Preview** button in the header.

The panel is resizable — drag the divider between the editor and preview to adjust the split.

---

### 5.4 Terminal

The terminal is at the bottom of the IDE. It runs a real shell inside the WebContainer.

**Features:**
- Multiple tabs — click `+` to open a new terminal tab
- Search — click the search icon to find text in the terminal output
- Copy — copies selected terminal text
- Clear — clears the terminal output
- Close — hides the terminal panel
- Resizable — drag the top edge of the terminal to resize it

**Running commands:**

You can run any standard shell commands inside the WebContainer environment, for example:

```bash
npm install
npm run dev
ls -la
```

> Security note: Certain destructive commands are blocked for safety (e.g., `rm -rf /`, `shutdown`, `mkfs`).

---

## 6. AI Features

CodeForge includes AI-powered assistance backed by the **Groq API** (llama-3.3-70b-versatile model). All AI features can be toggled on or off from the header.

### 6.1 Code Suggestions

When AI is enabled, CodeForge can suggest code completions as you type.

**How it works:**
- After a short pause (3 seconds) while typing, an AI suggestion appears as ghost text inline in the editor.
- Press `Tab` to **accept** the suggestion.
- Press `Escape` to **reject** it.

**AI Settings** (accessible from the header dropdown) let you configure:

| Setting | Description |
|---|---|
| Code Completion (All Files) | Enable suggestions for all file types |
| Code Completion (TSX only) | Limit suggestions to `.tsx` files |
| Next Edit Suggestions | Suggest what to change next based on context |

---

### 6.2 Explain Code

Right-click in the editor (or use the AI context menu) and select **Explain** to get an AI-generated explanation of the selected code or the current file.

The explanation appears as an overlay near your cursor position. It describes what the code does in plain language.

---

### 6.3 Debug Code

Select **Debug** from the AI context menu to have the AI analyze your code for bugs and explain how to fix them.

The result appears as an overlay showing identified issues and suggested fixes.

---

### 6.4 AI Chat Sidebar

Click the **Chat** panel toggle to open the AI chat sidebar on the right side of the editor.

You can:
- Ask questions about your code
- Request code snippets or explanations
- Have a back-and-forth conversation with the AI assistant
- Attach file context to your messages

The chat maintains conversation history within your session.

---

## 7. GitHub Integration

CodeForge lets you push your project files directly to a GitHub repository.

### Requirements

- You must be signed in with **GitHub** (not Google) to use this feature.
- Your GitHub account must have access to the target repository.

### How to Push

1. Click the **GitHub** button in the header bar.
2. The GitHub Push modal opens.
3. Select a **repository** from the dropdown (your repos are fetched automatically).
4. Enter a **commit message** (defaults to `"Update from CodeForge IDE"`).
5. Click **Push**.

CodeForge will:
- Extract all files from your current project
- Create or update the `main` branch in the selected repository
- Commit all files with your chosen message

> If the repository is empty, CodeForge will initialize it with a README before pushing your files.

---

## 8. Settings

Access settings by clicking the **Settings** icon in the header or navigating to `/settings`.

### Profile

Displays your account information:
- Name
- Email address
- User ID
- Role
- Connected OAuth provider (Google or GitHub)

### Appearance

Choose your preferred theme:
- **Light**
- **Dark**
- **System** (follows your OS preference)

### Account

- View your connected sign-in provider
- **Sign Out** — ends your current session

### Danger Zone

- **Delete Account** — permanently removes your account and all associated data

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save current file |
| `Tab` | Accept AI suggestion |
| `Escape` | Reject AI suggestion / close overlay |

---

*CodeForge — Code with Intelligence.*
