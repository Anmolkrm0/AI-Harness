import { ImapFlow } from 'imapflow';
import { ServiceTestResult } from '../providers/types.js';

export interface GmailCredentials {
  user: string;
  pass: string;
  host?: string;
  port?: number;
}

export interface EmailSummary {
  uid: number;
  seq: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
}

export class GmailService {
  private static getClient(creds: GmailCredentials): ImapFlow {
    const cleanPass = creds.pass.replace(/\s+/g, '');
    return new ImapFlow({
      host: creds.host || 'imap.gmail.com',
      port: creds.port || 993,
      secure: true,
      auth: {
        user: creds.user.trim(),
        pass: cleanPass,
      },
      logger: false,
    });
  }

  static async testConnection(creds: GmailCredentials): Promise<ServiceTestResult> {
    const start = Date.now();
    const client = this.getClient(creds);

    try {
      await client.connect();
      const status = await client.status('INBOX', { messages: true, unseen: true });
      await client.logout();

      const latencyMs = Date.now() - start;
      return {
        service: 'gmail',
        success: true,
        message: `Successfully connected to Gmail IMAP! Inbox has ${status.messages || 0} messages (${status.unseen || 0} unread).`,
        latencyMs,
      };
    } catch (err: any) {
      try {
        await client.logout();
      } catch {}
      return {
        service: 'gmail',
        success: false,
        message: err?.message || 'Failed to authenticate with Gmail IMAP. Please ensure you are using a 16-character Google App Password with 2FA enabled.',
        latencyMs: Date.now() - start,
      };
    }
  }

  static async searchEmails(creds: GmailCredentials, rawQuery: string, limit = 5): Promise<EmailSummary[]> {
    const client = this.getClient(creds);
    const emails: EmailSummary[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        let searchCriteria: any = { all: true };

        const queryLower = (rawQuery || '').toLowerCase().trim();
        const isGeneralInboxQuery =
          !queryLower ||
          queryLower.includes('recent') ||
          queryLower.includes('latest') ||
          queryLower.includes('today') ||
          queryLower.includes('inbox') ||
          queryLower.includes('my email') ||
          queryLower.includes('fetch email') ||
          queryLower.includes('check email') ||
          queryLower.includes('get email') ||
          queryLower.includes('summarize email');

        if (queryLower === 'unread' || queryLower === 'unseen' || queryLower.includes('unread email')) {
          searchCriteria = { unseen: true };
        } else if (!isGeneralInboxQuery) {
          // Clean search query to extract search terms
          const cleanQ = rawQuery
            .replace(/fetch|check|show|get|search|find|emails?|from|in|gmail/gi, '')
            .trim();

          if (cleanQ.length > 2) {
            searchCriteria = {
              or: [
                { subject: cleanQ },
                { from: cleanQ },
                { body: cleanQ },
              ],
            };
          } else {
            searchCriteria = { all: true };
          }
        }

        // Fetch messages matching criteria, latest first
        const messagesResult = await client.search(searchCriteria, { uid: true });
        const messages: number[] = Array.isArray(messagesResult) ? messagesResult : [];
        const targetUids = messages.slice(-limit).reverse();

        if (targetUids.length > 0) {
          // ImapFlow requires { uid: true } in the 3rd options argument when fetching by UID
          const uidRange = targetUids.join(',');
          for await (const message of client.fetch(
            uidRange,
            { envelope: true, source: true },
            { uid: true }
          )) {
            const envelope = message.envelope;
            const fromAddr = envelope && envelope.from && envelope.from[0]
              ? `${envelope.from[0].name || ''} <${envelope.from[0].address}>`
              : 'Unknown';
            const toAddr = envelope && envelope.to && envelope.to[0]
              ? `${envelope.to[0].name || ''} <${envelope.to[0].address}>`
              : 'Unknown';
            const subject = envelope?.subject || '(No Subject)';
            const dateStr = envelope?.date ? new Date(envelope.date).toLocaleString() : 'Unknown';

            let body = '';
            if (message.source) {
              const rawSource = message.source.toString();
              const headerEnd = rawSource.indexOf('\r\n\r\n');
              const rawBody = headerEnd !== -1 ? rawSource.substring(headerEnd + 4) : rawSource;
              body = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
            }

            emails.push({
              uid: message.uid,
              seq: message.seq,
              subject,
              from: fromAddr,
              to: toAddr,
              date: dateStr,
              snippet: body.slice(0, 200),
              body: body || undefined,
            });
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      try {
        await client.logout();
      } catch {}
      console.error('Error fetching emails from Gmail IMAP:', err);
      throw err;
    }

    return emails;
  }

  static formatForPrompt(emails: EmailSummary[]): string {
    if (emails.length === 0) {
      return `### Gmail Inbox Results: No matching emails found in INBOX.\n\n`;
    }

    let out = `### Gmail Inbox Emails (${emails.length} found):\n\n`;
    emails.forEach((e, idx) => {
      out += `Email #${idx + 1}:\n`;
      out += `- Subject: ${e.subject}\n`;
      out += `- From: ${e.from}\n`;
      out += `- Date: ${e.date}\n`;
      out += `- Content Preview:\n${e.body || e.snippet}\n\n`;
    });
    return out;
  }
}
