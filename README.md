# Job Application Tracker

A full-stack web app that automatically scans your Gmail for job application emails, classifies them by status, and tracks everything in Google Sheets — with a dashboard to visualize your job search funnel and AI-powered rejection insights.

---

## Features

- **Gmail auto-scan** — scans your inbox for job-related emails using a multi-layer classification engine
- **Smart classification** — rule-based detection with Claude AI fallback for ambiguous emails:
  - Rejection detection (catches rejections even when subject says "Thank you for applying")
  - Interview detection using specific scheduling phrases
  - "Hello from" disambiguation — body inspection determines Referred vs Interview vs ambiguous
  - Referral detection via body phrase matching
  - LinkedIn saved job detection
  - Claude AI (claude-haiku) for truly ambiguous emails only
- **Funnel dashboard** — visual conversion funnel: Applied → In Review → Interview → Rejected
- **Leads section** — tracks LinkedIn saved jobs and employee referrals separately from applications
- **Referred → Applied promotion** — when you apply to a referred job, the Referred entry is automatically removed on next scan
- **Date range filter** — filter dashboard view and scan range by start/end date (MM/DD/YYYY), minimum May 1 2025
- **Duplicate management** — mark duplicate emails so they don't inflate counts
- **Manual add/edit** — add or edit applications manually via a form
- **AI rejection insights** — one-click Claude analysis of your rejection patterns with actionable tips
- **Persistent last scan** — scan timestamp stored in Google Sheets, survives server restarts
- **Google Sheets backend** — all data stored in your own Google Sheet, no separate database needed
- **Full Scan / Incremental Scan** — full scan re-processes all emails from May 1 2025; incremental scan only checks new emails since last scan

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + React Router |
| Backend | Node.js + Express |
| Auth | Google OAuth 2.0 (Passport.js) |
| Email | Gmail API (read-only) |
| Storage | Google Sheets API |
| AI | Anthropic Claude Haiku (ambiguous classification + rejection insights) |
| Hosting | Railway (single service — backend serves frontend as static files) |

---

## Architecture

```
Browser
  └── Railway (single service)
        ├── Express server
        │     ├── /auth/google        → Google OAuth flow
        │     ├── /api/jobs           → CRUD via Google Sheets
        │     ├── /api/jobs/insights  → Claude rejection analysis
        │     ├── /api/gmail/scan     → Gmail scan + classification
        │     └── /public             → React frontend (static files)
        └── Google APIs
              ├── Gmail API (readonly)
              ├── Google Sheets API
              └── Google OAuth 2.0
```

---

## Classification Pipeline

Each email goes through these layers in order:

```
1. Blocklist          → skip non-job senders (family, utilities, spam, etc.)
2. LinkedIn leads     → classify as "Leads" (saved jobs / job alerts)
3. "Hello from"       → body inspection → Referred / Interview / Claude
4. Referred           → body has referral phrases → "Referred"
5. Rule-based         → Rejected / Interview / In Review / Applied
6. Claude AI          → truly ambiguous emails sent to claude-haiku
```

**Status priority** (rejection always wins over other signals):
`Rejected > Interview > In Review > Applied`

---

## Application Statuses

| Status | Description |
|--------|-------------|
| Applied | Auto-acknowledgement received, application submitted |
| In Review | Company confirmed they are actively reviewing your profile |
| Interview | Interview scheduled, assessment sent, or scheduling requested |
| Rejected | Declined or not moving forward |
| Leads | LinkedIn saved jobs or job alerts |
| Referred | Employee referral received, not yet applied |
| Duplicate | Duplicate email, excluded from all counts |

---

## Project Structure

```
jat-2026/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Nav with scan buttons + date range filter
│   │   │   ├── StatCard.jsx    # Dashboard stat tiles
│   │   │   ├── Funnel.jsx      # Conversion funnel + Leads/Referred section
│   │   │   ├── CompanyList.jsx # Company grid by status
│   │   │   ├── RoleList.jsx    # Role cards with email viewer + mark duplicate
│   │   │   └── JobForm.jsx     # Add/edit job modal
│   │   └── pages/
│   │       └── Dashboard.jsx   # Main dashboard + rejection insights
│   ├── index.css
│   └── vite.config.js
├── server/                     # Express backend
│   ├── routes/
│   │   ├── auth.js             # Google OAuth routes
│   │   ├── jobs.js             # CRUD routes + /insights endpoint
│   │   └── gmail.js            # Gmail scan routes
│   ├── services/
│   │   ├── gmail.js            # Multi-layer classification engine
│   │   └── googleSheets.js     # Sheets read/write + lastScan persistence
│   ├── middleware/
│   │   └── requireAuth.js
│   └── index.js                # Express app entry point
└── package.json                # Root package — builds client + starts server
```

---

## Setup & Deployment

### Prerequisites

- Node.js 20+
- Google Cloud project with these APIs enabled:
  - Gmail API
  - Google Sheets API
  - Google OAuth 2.0
- Anthropic API key
- Railway account (free tier works)

### Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Gmail API** and **Google Sheets API**
3. Configure **OAuth consent screen**:
   - Add scopes: `gmail.readonly` and `spreadsheets`
   - Set to External
4. Create an **OAuth 2.0 Client ID** (Web application type)
5. Add your Railway URL to **Authorized JavaScript origins**
6. Add `https://your-app.railway.app/auth/google/callback` to **Authorized redirect URIs**

### Google Sheets Setup

1. Create a new blank Google Sheet
2. Copy the Sheet ID from the URL (long string between `/d/` and `/edit`)
3. Add a second tab called exactly `Meta` (used for storing scan timestamps)
4. The app auto-creates headers on first run

### Environment Variables

Set these in Railway → your service → Variables:

```
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_SHEET_ID=your_sheet_id
SESSION_SECRET=any_random_string_here
CLIENT_URL=https://your-app.railway.app
CALLBACK_URL=https://your-app.railway.app/auth/google/callback
ANTHROPIC_API_KEY=your_anthropic_key
NODE_ENV=production
```

### Deploy to Railway

1. Push repo to GitHub (private repo recommended)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Set **Root Directory** to blank
5. Set **Build command**: `npm run build`
6. Set **Start command**: `npm start`
7. Add all environment variables above
8. Deploy!

---

## Usage Guide

### Scanning
- **Scan Gmail** — checks for new emails since last scan only
- **Full Scan** — clears all Gmail-sourced entries and re-scans everything from May 1 2025 with latest rules. Use after updating classification rules.

### Date Filter
- Click **Filter** in the navbar to set a start and/or end date (MM/DD/YYYY)
- Filters both the dashboard view and the scan range
- Minimum start date is May 1 2025

### Managing Applications
- Click any stat tile to see companies filtered by that status
- Click a company to see all roles with email previews
- **Mark as Duplicate** when two emails exist for the same application (e.g. confirmation + tracking email)
- **Edit** any entry to correct company name, role, status, or add notes
- **+ Add Job** to manually add applications not captured by Gmail scan

### Leads & Referrals
- LinkedIn saved jobs appear in the **Leads** section of the funnel, not in application counts
- Referred emails appear in the **Referred** section — jobs you've been referred to but haven't applied yet
- Once you apply to a referred job, the Referred entry is automatically removed on the next scan

### Rejection Insights
- Click **✦ Get insights** (amber button in the header) to get a Claude AI analysis of your rejection patterns
- Shows pattern observations and one actionable tip
- Costs under $0.01 per click (uses claude-haiku with 150 token limit)
- Click **dismiss** to hide the insight card

---

## Customization

### Blocklist — block unwanted senders
Edit `server/services/gmail.js` → `BLOCKLIST` array. Add sender names, email addresses, or domain keywords. Changes take effect on next Full Scan.

### Classification phrases

| Array | Purpose |
|-------|---------|
| `REJECTION_PHRASES` | Phrases that indicate rejection (checked in subject + body) |
| `INTERVIEW_PHRASES` | Phrases that indicate interview scheduling |
| `IN_REVIEW_PHRASES` | Phrases that indicate genuine status change to in review |
| `REFERRED_BODY_PHRASES` | Body phrases that indicate employee referral |
| `LEAD_SUBJECTS` | Subject phrases for LinkedIn saved jobs / alerts |
| `APPLIED_SUBJECTS` | Subject phrases for application confirmations |

### Full scan start date
Edit `FULL_SCAN_START` in `server/services/gmail.js`:
```js
const FULL_SCAN_START = new Date('2025-05-01').getTime() / 1000;
```

### Insights prompt
Edit the prompt in `server/routes/jobs.js` in the `/insights` route to customize what Claude analyzes.

---

## Known Limitations

- Gmail scan limited to 200 emails per scan (configurable via `maxResults` in `gmail.js`)
- Session uses in-memory store — fine for single user, not suitable for multi-user at scale
- Access tokens expire after 1 hour — handled automatically via refresh tokens
- Claude AI is only called for ambiguous emails and insights to keep API costs minimal

---

## Cost Estimate (Anthropic API)

| Action | Model | Approx cost |
|--------|-------|-------------|
| Per ambiguous email classified | claude-haiku | ~$0.0001 |
| Per insights click | claude-haiku | ~$0.005 |
| Full scan (200 emails, ~20 ambiguous) | claude-haiku | ~$0.002 |

---

## Built With

This project was built iteratively with [Claude](https://claude.ai) as a PM + coding learning exercise, covering: Google OAuth, Gmail API, Google Sheets API, React, Express, Railway deployment, and Anthropic API integration.
