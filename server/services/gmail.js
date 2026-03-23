const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk').default;

function getGmailClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set in .env');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Hybrid filter layer ──────────────────────────────────────────────────────

// Emails from these senders are never job-related — skip before any API call
const BLOCKLIST = [
  // Name/domain keywords
  'hemant mohan', 'western exterminator', 'srvef', 'coyote creek', 'pta', 'ptsa',
  'konstella', 'srvusd.net', 'ap visions', 'equity zen', 'equityzen', 'fidelity',
  'simply wall st', 'simply wallstreet', 'rsm', 'patelco', 'usps', 'ebmud',
  'hilary chu', 'ballet', 'credit card', 'informed delivery',
  // Exact sender addresses
  'communications@srvcouncilpta.org',
  'info@srvef.ccsend.com',
  'subscriptions@seekingalpha.com',
  'president@coyotecreekpta.com',
  'admin@rachelsballet.com',
];

// Emails whose Subject contains these phrases are definitely job-related — skip API call
const ALLOWLIST_SUBJECTS = [
  'thank you for applying',
  'thank you from',
  'thanks for applying',
  'hello from',
  'interview scheduling',
  'interview invitation',
  'phone conversation with',
  'phone screen',
  'we received your application',
  'your application',
  'application received',
  'application confirmation',
  'application for',
  'applied for',
  'next steps',
  'moving forward',
  'offer letter',
  'job offer',
  'we regret',
  'not moving forward',
  'unfortunately',
  'coding challenge',
  'technical assessment',
  'take-home'
];

const STATUS_FROM_SUBJECT = [
  { phrases: ['regret', 'not moving forward', 'unfortunately', 'unable to move forward', 'position has been filled'], status: 'Rejected' },
  { phrases: ['interview', 'phone screen', 'phone conversation', 'next steps', 'moving forward', 'coding challenge', 'technical assessment', 'take-home', 'offer letter', 'job offer'], status: 'Next Steps' },
  { phrases: ['thank you for applying', 'thanks for applying', 'we received your application', 'application received', 'application confirmation', 'applied for', 'application for', 'hello from', 'thank you from'], status: 'In Review' },
];

function isBlocked(email) {
  const lower = (email.from + ' ' + email.subject).toLowerCase();
  return BLOCKLIST.some(term => lower.includes(term));
}

function getAllowlistMatch(subject) {
  const lower = subject.toLowerCase();
  return ALLOWLIST_SUBJECTS.find(phrase => lower.includes(phrase)) || null;
}

function detectStatusFromSubject(subject) {
  const lower = subject.toLowerCase();
  for (const { phrases, status } of STATUS_FROM_SUBJECT) {
    if (phrases.some(p => lower.includes(p))) return status;
  }
  return 'In Review';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Claude classification (only for ambiguous emails) ────────────────────────

async function classifyWithClaude(emails) {
  if (emails.length === 0) return [];
  const anthropic = getAnthropicClient();
  const emailList = emails.map((e, i) =>
    `[${i}] From: ${e.from}\nSubject: ${e.subject}`
  ).join('\n\n');

  console.log(`[Claude] Classifying ${emails.length} ambiguous emails...`);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Classify each email: is it a job application email (sent to someone who applied for a job)?

Respond ONLY with a JSON array. Each element:
- "index": number in brackets
- "isJob": true/false
- "status": "In Review" | "Next Steps" | "Rejected" (only if isJob, else null)
- "company": company name (only if isJob, else null)
- "role": job title (only if isJob, else null)

Emails:
${emailList}

JSON array only, no other text.`
    }]
  });

  const text = response.content.find(b => b.type === 'text')?.text || '[]';
  console.log('[Claude] Response:', text.substring(0, 300));
  try {
    const parsed = JSON.parse(text);
    console.log(`[Claude] ${parsed.filter(r => r.isJob).length}/${parsed.length} are job emails`);
    return parsed;
  } catch {
    console.error('[Claude] Failed to parse response:', text);
    return [];
  }
}

// ── Main scan ────────────────────────────────────────────────────────────────

const GMAIL_SEARCH_QUERY = [
  '"application"', '"applied"', '"interview"', '"offer"',
  '"hiring"', '"recruiting"', '"position"', '"role"'
].join(' OR ');

async function scanJobEmails(accessToken, afterTimestamp) {
  const gmail = getGmailClient(accessToken);

  let query = GMAIL_SEARCH_QUERY;
  if (afterTimestamp) {
    const epochSeconds = Math.floor(new Date(afterTimestamp).getTime() / 1000);
    query = `(${query}) after:${epochSeconds}`;
  }

  const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 100 });
  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  // Fetch metadata only
  const emailMeta = [];
  for (const msg of messages) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me', id: msg.id, format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });
      const headers = msgRes.data.payload?.headers || [];
      emailMeta.push({
        id: msg.id,
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        from: headers.find(h => h.name === 'From')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || ''
      });
    } catch (err) {
      console.error('Error fetching metadata:', msg.id, err.message);
    }
  }

  const jobs = [];
  const ambiguous = [];

  for (const email of emailMeta) {
    // Layer 1: blocklist — drop immediately
    if (isBlocked(email)) {
      console.log(`[Block] ${email.from} | ${email.subject}`);
      continue;
    }

    // Layer 2: allowlist — known job email, classify locally
    const allowMatch = getAllowlistMatch(email.subject);
    if (allowMatch) {
      console.log(`[Allow] ${email.subject}`);
      jobs.push(buildJob(
        email,
        extractCompanyFromEmail(email.from),
        extractRoleFromSubject(email.subject),
        detectStatusFromSubject(email.subject)
      ));
      continue;
    }

    // Layer 3: ambiguous — send to Claude
    ambiguous.push(email);
  }

  console.log(`[Scan] ${jobs.length} allowlisted, ${ambiguous.length} sent to Claude, ${emailMeta.length - jobs.length - ambiguous.length} blocked`);

  // Process ambiguous in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < ambiguous.length; i += BATCH_SIZE) {
    const batch = ambiguous.slice(i, i + BATCH_SIZE);
    let classifications = [];
    try {
      classifications = await classifyWithClaude(batch);
    } catch (err) {
      console.error('[Claude] Error:', err.message);
      throw new Error(`Claude API error: ${err.message}`);
    }

    for (const result of classifications) {
      if (!result.isJob) continue;
      const email = batch[result.index];
      if (!email) continue;
      jobs.push(buildJob(
        email,
        result.company || extractCompanyFromEmail(email.from),
        result.role || extractRoleFromSubject(email.subject),
        result.status || 'In Review'
      ));
    }
  }

  return jobs;
}

module.exports = { scanJobEmails };
