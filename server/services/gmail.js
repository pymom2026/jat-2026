const { google } = require('googleapis');

function getGmailClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

// ── Blocklist ─────────────────────────────────────────────────────────────────
const BLOCKLIST = [
  'hemant mohan', 'western exterminator', 'srvef', 'coyote creek', 'pta', 'ptsa',
  'konstella', 'srvusd.net', 'ap visions', 'equity zen', 'equityzen', 'fidelity',
  'simply wall st', 'simply wallstreet', 'rsm', 'patelco', 'usps', 'ebmud',
  'hilary chu', 'ballet', 'credit card', 'informed delivery',
  'communications@srvcouncilpta.org', 'info@srvef.ccsend.com',
  'subscriptions@seekingalpha.com', 'president@coyotecreekpta.com',
  'admin@rachelsballet.com','Passport Application Status',
];

// ── Allowlist subjects ────────────────────────────────────────────────────────
const ALLOWLIST_SUBJECTS = [
  'thank you for applying', 'thank you from', 'thanks for applying',
  'hello from', 'interview scheduling', 'interview invitation',
  'phone conversation with', 'phone screen',
  'we received your application', 'your application',
  'application received', 'application confirmation',
  'application for', 'applied for', 'next steps', 'moving forward',
  'offer letter', 'job offer', 'we regret', 'not moving forward',
  'unfortunately', 'coding challenge', 'technical assessment', 'take-home',
  'your job application', 'application update', 'application status', 'you've been referred', 'you have been referred', 'referred you for', 'referred for the',
];

// ── LinkedIn "saved job" / lead subjects ──────────────────────────────────────
const LEAD_SUBJECTS = [
  'is added!', 'saved job', 'job alert', 'jobs for you',
  'recommended for you', 'take these next steps', 'new jobs matching',
  'people also applied', 'similar jobs', 'jobs you may like',
  'your job search', 'based on your profile',
];

// ── Rejection phrases (body + subject) ───────────────────────────────────────
const REJECTION_PHRASES = [
  'unfortunately', 'we regret', 'not moving forward', 'unable to move forward',
  'decided to move forward with other', 'move ahead with other candidates',
  'will not be moving forward', 'after careful consideration',
  'we have decided', 'not selected', 'position has been filled',
  'gone with another candidate', 'other candidates whose experience',
  'not a match', 'not the right fit', 'wish you the best',
  'keep your resume on file', 'we will keep your information on file',
];

// ── Next steps / interview phrases ───────────────────────────────────────────
const NEXT_STEPS_PHRASES = [
  'interview', 'phone screen', 'phone conversation', 'video call',
  'next steps', 'moving forward', 'coding challenge',
  'technical assessment', 'take-home', 'offer letter', 'job offer',
  'schedule a call', 'schedule time', 'we would like to speak',
  'excited to move', 'pleased to invite',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isBlocked(email) {
  const lower = (email.from + ' ' + email.subject).toLowerCase();
  return BLOCKLIST.some(term => lower.includes(term));
}

function isLead(subject) {
  const lower = subject.toLowerCase();
  return LEAD_SUBJECTS.some(phrase => lower.includes(phrase));
}

function getAllowlistMatch(subject) {
  const lower = subject.toLowerCase();
  return ALLOWLIST_SUBJECTS.find(phrase => lower.includes(phrase)) || null;
}

function detectStatus(subject, body) {
  const text = (subject + ' ' + (body || '')).toLowerCase();

  // Rejection takes priority — even if subject says "thank you for applying"
  if (REJECTION_PHRASES.some(p => text.includes(p))) return 'Rejected';

  // Next steps / interview
  if (NEXT_STEPS_PHRASES.some(p => text.includes(p))) return 'Interview';

  return 'In Review';
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
  } catch {
    return '';
  }
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

// ── Main scan ─────────────────────────────────────────────────────────────────
const GMAIL_SEARCH_QUERY = [
  '"application"', '"applied"', '"applying"','"interview"', '"offer"',
  '"hiring"', '"recruiting"', '"position"', '"role"'
].join(' OR ');

// Full scan starts from May 1 2025
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

  for (const msg of messages) {
    try {
      // Fetch full message to get body for better classification
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

      // Layer 2: LinkedIn leads / saved jobs
      if (isLead(email.subject)) {
        console.log(`[Lead] ${email.subject}`);
        jobs.push(buildJob(email, extractCompanyFromEmail(email.from), email.subject.substring(0, 80), 'Leads'));
        continue;
      }

      // Layer 3: allowlist match — classify using subject + body
      const allowMatch = getAllowlistMatch(email.subject);
      if (allowMatch) {
        const status = detectStatus(email.subject, email.body);
        console.log(`[Allow] ${status} | ${email.subject}`);
        jobs.push(buildJob(
          email,
          extractCompanyFromEmail(email.from),
          extractRoleFromSubject(email.subject),
          status
        ));
        continue;
      }

      console.log(`[Skip] ${email.subject}`);
    } catch (err) {
      console.error('Error fetching message:', msg.id, err.message);
    }
  }
  
// Deduplicate only by Gmail message ID — keep all legitimate separate emails
const seen = new Set();
const deduped = jobs.filter(j => {
  if (seen.has(j.gmailId)) return false;
  seen.add(j.gmailId);
  return true;
});
console.log(`[Scan] ${deduped.length} unique jobs from ${jobs.length} raw matches, ${messages.length} emails scanned`);
return deduped;
  
}

module.exports = { scanJobEmails };
