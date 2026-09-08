import { env } from './env.ts';

/** Reads the bindings for the request in flight. */
export const config = {
  get publicBaseUrl() { return (env().PUBLIC_BASE_URL ?? 'http://localhost:8787').replace(/\/$/, ''); },
  get adminToken() { return env().ADMIN_TOKEN; },

  get openmail() {
    const e = env();
    return {
      apiKey: e.OPENMAIL_API_KEY,
      inboxId: e.OPENMAIL_INBOX_ID,
      inboxAddress: e.OPENMAIL_INBOX_ADDRESS ?? '',
      webhookSecret: e.OPENMAIL_WEBHOOK_SECRET,
      baseUrl: 'https://api.openmail.sh',
    };
  },

  get openai() {
    const e = env();
    return {
      apiKey: e.OPENAI_API_KEY,
      fast: e.MODEL_FAST ?? 'gpt-5.6-luna',
      strong: e.MODEL_STRONG ?? 'gpt-5.6-terra',
      confidenceThreshold: Number(e.CONFIDENCE_THRESHOLD ?? 0.8),
    };
  },

  get sendConfirmation() { return env().SEND_CONFIRMATION !== 'false'; },
};
