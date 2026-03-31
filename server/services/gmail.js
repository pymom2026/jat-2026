const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk').default;

function getGmailClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Blocklist ─────────────────────────────────────────────────────────────────
const BLOCKLIST = [
  'hemant mohan', 'western exterminator', 'srvef', 'coyote creek', 'pta', 'ptsa',
  'konstella', 'srvusd.net', 'ap visions', 'equity zen', 'equityzen', 'fidelity',
  'simply wall st', 'simply wallstreet', 'rsm', 'patelco', 'usps', 'ebmud',
  'hilary chu', 'ballet', 'credit card', 'informed delivery',
  'communications@srvcouncilpta.org', 'info@srvef.ccsend.com',
  'subscriptions@seekingalpha.com', 'president@coyotecreekpta.com',
  'admin@rachelsballet.com', 'passport application status', 'passport services',
];

// ── LinkedIn saved job leads ───────────────────────────────────────────────────
const LEAD_SUBJECTS = [
  'is added!', 'saved job', 'job alert', 'jobs for you',
  'recommended for you', 'take these next steps', 'new jobs matching',
  'people also applied', 'similar jobs', 'jobs you may like',
  'your job search', 'based on your profile',
];

// ── Referred lead phrases (body) ──────────────────────────────────────────────
const REFERRED_BODY_PHRASES = [
  'we received your information from an employee',
  'they thought you might be interested',
  'referred you for',
  'referred by',
  'employee referral',
  'was referred to us',
  'your colleague',
  'someone at our company',
  'internal referral',
];

// ── Rejection phrases ─────────────────────────────────────────────────────────
const REJECTION_PHRASES = [
  'unfortunately', 'we regret', 'not moving forward', 'unable to move forward',
  'decided to move forward with other', 'move ahead with other candidates',
  'will not be moving forward', 'after careful consideration',
  'we have decided not', 'not selected', 'position has been filled',
  'gone with another candidate', 'other candidates whose experience',
  'not a match', 'not the right fit',
  'keep your resume on file', 'we will keep your information on file',
  'have chosen to', 'chosen another', 'pursue other candidates',
];

// ── Interview phrases ─────────────────────────────────────────────────────────
const INTERVIEW_PHRASES = [
  'schedule an interview', 'invite you to interview', 'interview invitation',
  'interview request', 'phone screen', 'phone conversation', 'video interview',
  'video call', 'coding challenge', 'technical assessment', 'take-home assignment',
  'offer letter', 'job offer', 'we would like to speak with you',
  'excited to move you forward', 'pleased to invite you',
  'next round', 'final round', 'onsite interview', 'virtual interview',
  'meet with our team', 'chat with our team',
];

// ── Applied / confirmed phrases (subject) ─────────────────────────────────────
const APPLIED_SUBJECTS = [
  'thank you for applying', 'thanks for applying',
  'we received your application', 'your application',
  'application received', 'application confirmation',
  'application for', 'applied for',
  'your job application', 'application update',
  "you've been referred", 'you have been referred',
  'referred for the', 'you were referred',
];

// ── Real "In Review" status change phrases ────────────────────────────────────
const IN_REVIEW_PHRASES = [
  'application is under review', 'currently reviewing',
  'your application is being reviewed', 'status has been updated',
  'status changed to', 'moved to review', 'in progress',
  'application is in review', 'actively reviewing',
  'shortlisted', 'under consideration',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isBlocked(email) {
  const lower = (email.from + ' ' + email.subject).toLowerCase();
  return BLOCKLIST.some(term => lower.includes(term.toLowerCase()));
}

function isLead(subject) {
  const lower = subject.toLowerCase();
  return LEAD_SUBJECTS.some(phrase => lower.includes(phrase));
}

function isReferred(subject, body) {
  const bodyLower = (body || '').toLowerCase();
  return REFERRED_BODY_PHRASES.some(p => bodyLower.includes(p));
}

function detectStatus(subject, body) {
  const subjectLower = subject.toLowerCase();
  const text = (subject + ' ' + (body || '')).toLowerCase();

  // Rejection always wins — even if subject says "thank you for applying"
  if (REJECTION_PHRASES.some(p => text.includes(p))) return 'Rejected';

  // Interview signals
  if (INTERVIEW_PHRASES.some(p => text.includes(p))) return 'Interview';

  // Real status change to "In Review"
  if (IN_REVIEW_PHRASES.some(p => text.includes(p))) return 'In Review';

  // Applied confirmation subjects → Applied (not In Review)
  if (APPLIED_SUBJECTS.some(p => subjectLower.includes(p))) return 'Applied';

  return null; // ambiguous — let Claude decide
}

function extractCompanyFromEmail(from) {
  const fromMatch = from.match(/^(.+?)\s*</);
  if (fromMatch) {
    let name = fromMatch[1].trim().replace(/"/g, '');
    name = name.replace(/\s*(careers|recruiting|talent|hr|jobs|hiring|no.?reply|notifications?)\s*/gi, '').trim();
    if (name.length > 0 && name.length < 60) return name;
  }
  const domainMatch = from.match(/@([^.>]+)\./);
  if (domainMatch) return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
  return 'Unknown';
}

function extractRoleFromSubject(subject) {
  const patterns = [
    /(?:application|applied|applying)\s+(?:for|to)\s+(?:the\s+)?(.+?)(?:\s+(?:position|role|job|opening))?(?:\s+at\s+|$)/i,
    /(?:position|role|job|opening):\s*(.+)/i,
    /re:\s*(.+?)\s+(?:application|position|role)/i
  ];
  for (const pat of patterns) {
    const m = subject.match(pat);
    if (m) return m[1].trim().substring(0, 80);
  }
  return subject.substring(0, 80);
}

function decodeBody(data) {
  if (!data) return '';
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch { return ''; }
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return decodeBody(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) return decodeBody(part.body.data);
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) return decodeBody(part.body.data);
    }
  }
  return '';
}

function buildJob(email, company, role, status) {
  return {
    company,
    role,
    dateApplied: email.date
      ? new Date(email.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status,
    source: 'Gmail',
    notes: `Auto-scanned: ${email.subject.substring(0, 100)}`,
    link: '',
    gmailId: email.id
  };
}

// ── Claude classification for ambiguous emails ────────────────────────────────
async function classifyWithClaude(emails) {
  if (emails.length === 0) return [];
  const anthropic = getAnthropicClient();

  const emailList = emails.map((e, i) =>
    `[${i}] From: ${e.from}\nSubject: ${e.subject}\nBody (first 300 chars): ${(e.body || '').substring(0, 300)}`
  ).join('\n\n');

  console.log(`[Claude] Classifying ${emails.length} ambiguous emails...`);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are classifying job-related emails. For each email determine:
1. Is it a job application related email? (not spam, not unrelated)
2. What is the status?

Status options:
- "Applied" — confirmation that application was submitted
- "In Review" — company says they are actively reviewing (NOT just auto-acknowledgement)
- "Interview" — interview scheduled, invited, or assessment sent
- "Rejected" — declined or not moving forward
- "Referred" — someone referred the person, not yet applied
- "Leads" — saved job or job alert, not yet applied
- "ignore" — not job related

Respond ONLY with a JSON array. Each element must have:
- "index": number
- "isJob": true/false  
- "status": one of the above (only if isJob=true)
- "company": company name (only if isJob=true)
- "role": job title (only if isJob=true)

Emails:
${emailList}

JSON array only, no markdown, no explanation.`
    }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    console.error('[Claude] Failed to parse:', text.substring(0, 200));
    return [];
  }
}

// ── Main scan ─────────────────────────────────────────────────────────────────
const GMAIL_SEARCH_QUERY = [
  '"application"', '"applied"', '"applying"', '"interview"', '"offer"',
  '"hiring"', '"recruiting"', '"position"', '"role"', '"referred"'
].join(' OR ');

const FULL_SCAN_START = new Date('2025-05-01').getTime() / 1000;

async function scanJobEmails(accessToken, afterTimestamp, fullScan = false) {
  const gmail = getGmailClient(accessToken);

  let query = GMAIL_SEARCH_QUERY;
  const afterEpoch = fullScan
    ? FULL_SCAN_START
    : afterTimestamp
      ? Math.floor(new Date(afterTimestamp).getTime() / 1000)
      : null;

  if (afterEpoch) query = `(${query}) after:${afterEpoch}`;

  const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 200 });
  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const jobs = [];
  const ambiguous = []; // emails that need Claude

  for (const msg of messages) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me', id: msg.id, format: 'full'
      });
      const headers = msgRes.data.payload?.headers || [];
      const email = {
        id: msg.id,
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        from: headers.find(h => h.name === 'From')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || '',
        body: extractBody(msgRes.data.payload).substring(0, 1000),
      };

      // Layer 1: blocklist
      if (isBlocked(email)) {
        console.log(`[Block] ${email.subject}`);
        continue;
      }

      // Layer 2: LinkedIn saved jobs
      if (isLead(email.subject)) {
        console.log(`[Lead] ${email.subject}`);
        jobs.push(buildJob(email, extractCompanyFromEmail(email.from), email.subject.substring(0, 80), 'Leads'));
        continue;
      }

      // Layer 3: Referred — body contains referral phrases
      // But only if subject doesn't strongly indicate an interview
      const hasInterviewSubject = INTERVIEW_PHRASES.some(p => email.subject.toLowerCase().includes(p));
      if (!hasInterviewSubject && isReferred(email.subject, email.body)) {
        console.log(`[Referred] ${email.subject}`);
        jobs.push(buildJob(email, extractCompanyFromEmail(email.from), extractRoleFromSubject(email.subject), 'Referred'));
        continue;
      }

      // Layer 4: rule-based classification
      const status = detectStatus(email.subject, email.body);
      if (status !== null) {
        console.log(`[Rule] ${status} | ${email.subject}`);
        jobs.push(buildJob(
          email,
          extractCompanyFromEmail(email.from),
          extractRoleFromSubject(email.subject),
          status
        ));
        continue;
      }

      // Layer 5: ambiguous — send to Claude
      console.log(`[Ambiguous] ${email.subject}`);
      ambiguous.push(email);

    } catch (err) {
      console.error('Error fetching message:', msg.id, err.message);
    }
  }

  // Process ambiguous emails with Claude in batches of 15
  if (ambiguous.length > 0) {
    console.log(`[Claude] Processing ${ambiguous.length} ambiguous emails...`);
    const BATCH_SIZE = 15;
    for (let i = 0; i < ambiguous.length; i += BATCH_SIZE) {
      const batch = ambiguous.slice(i, i + BATCH_SIZE);
      try {
        const results = await classifyWithClaude(batch);
        for (const result of results) {
          if (!result.isJob || result.status === 'ignore') continue;
          const email = batch[result.index];
          if (!email) continue;
          jobs.push(buildJob(
            email,
            result.company || extractCompanyFromEmail(email.from),
            result.role || extractRoleFromSubject(email.subject),
            result.status
          ));
        }
      } catch (err) {
        console.error('[Claude] Batch error:', err.message);
      }
    }
  }

  // Deduplicate by Gmail message ID only
  const seen = new Set();
  const deduped = jobs.filter(j => {
    if (seen.has(j.gmailId)) return false;
    seen.add(j.gmailId);
    return true;
  });

  console.log(`[Scan] ${deduped.length} jobs from ${messages.length} emails (${ambiguous.length} used Claude)`);
  return deduped;
}

module.exports = { scanJobEmails };
