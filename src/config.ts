function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./data/venga.db',
  storageDir: process.env.STORAGE_DIR ?? './data/files',
  adminToken: need('ADMIN_TOKEN'),

  openmail: {
    apiKey: need('OPENMAIL_API_KEY'),
    inboxId: need('OPENMAIL_INBOX_ID'),
    inboxAddress: process.env.OPENMAIL_INBOX_ADDRESS ?? '',
    webhookSecret: need('OPENMAIL_WEBHOOK_SECRET'),
    baseUrl: 'https://api.openmail.sh',
  },

  openai: {
    apiKey: need('OPENAI_API_KEY'),
    fast: process.env.MODEL_FAST ?? 'gpt-5.6-luna',
    strong: process.env.MODEL_STRONG ?? 'gpt-5.6-terra',
    confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD ?? 0.8),
  },

  /** live = call OpenAI. replay = read a recorded answer from fixtures/llm/. */
  llmMode: (process.env.LLM_MODE ?? 'live') as 'live' | 'replay',
  sendConfirmation: process.env.SEND_CONFIRMATION !== 'false',
};
