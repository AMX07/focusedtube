# FocusTube

A distraction-free YouTube learning environment built for focused video series consumption. Features progress tracking, playback speed control, notes, and AI-powered transcript summaries saved to Obsidian.

## Prerequisites

- **Node.js** (v18+)
- **Python** (3.10+)
- **Anthropic API key** (for transcript summaries)

## Setup

### Frontend

```bash
npm install
```

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

## Running

Start both servers in separate terminals:

**Terminal 1 — Backend (FastAPI on port 8000):**

```bash
export ANTHROPIC_API_KEY="your-key-here"
source .venv/bin/activate
cd server
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (Vite on port 5173):**

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

The Vite dev server proxies `/api` requests to the backend automatically (configured in `vite.config.js`).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes (for summaries) | Your Anthropic API key |
| `OBSIDIAN_VAULT` | No | Path to Obsidian vault folder (defaults to `~/obsidian-vault/FocusTube`) |

## Project Structure

```
focusedtube/
├── src/
│   ├── App.jsx          # Root component
│   ├── App.css          # Global styles
│   └── main.jsx         # Entry point
├── server/
│   ├── main.py          # FastAPI backend (transcript fetch + Claude summary)
│   └── requirements.txt # Python dependencies
├── index.html           # HTML entry point
├── vite.config.js       # Vite config with API proxy
├── package.json         # Node dependencies and scripts
└── eslint.config.js     # ESLint config
```

## Features

- YouTube video player with series playlist
- Per-video progress tracking (saved to localStorage)
- Playback speed control (0.75x–2x)
- Note-taking per video
- AI transcript summaries via Claude (auto-saved to Obsidian)
- Collapsible sidebar
- Custom YouTube URL loading
