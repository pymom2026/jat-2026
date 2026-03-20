# jat-2026
The original job application tracker
# User prompt
Build me a job application tracker web app. Here are the details:

    Tech stack: React frontend, Node/Express backend

    Auth: Google OAuth 2.0
    
    APIs: Gmail API (readonly) + Google Sheets API
  
  
  Create a .env file with placeholders for:

    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
    GOOGLE_SHEET_ID
    SESSION_SECRET (generate a random one)

Features:

Google OAuth login

Dashboard with stat cards: Total Applied, In Review, Next Steps, Rejected

Clicking a stat card drills into a company list filtered by that status

Clicking a company shows all roles applied to there

Gmail auto-scan: search for job application emails, use keywords like "application received", "thank you for applying", "we regret to inform" to extract company, role, and status, then write to Google Sheets

Manual add/edit job form

Google Sheets structure: Company, Role, Date Applied, Status, Source, Notes, Link

Start by scaffolding the full project structure, installing dependencies, and setting up Google OAuth.
