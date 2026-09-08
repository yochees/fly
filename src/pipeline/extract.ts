import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { config } from '../config.ts';
import { tripSchema, type Extracted } from './schema.ts';
import type { OpenMailAttachment } from '../lib/openmail.ts';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/** USD per million tokens. Only used to record what a run cost. */
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-5.6-luna': { in: 0.2, out: 1.2 },
  'gpt-5.6-terra': { in: 2, out: 12 },
  'gpt-5.6-sol': { in: 4, out: 20 },
  'gpt-6-astra': { in: 10, out: 50 },
};

const IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
const OCR_METHODS = new Set(['ocr', 'unsupported', 'pdf_error', 'skipped_too_large']);

export type TripCandidate = {
  id: string;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  route: string;
  bookingRefs: string[];
};

export type ExtractInput = {
  from: string;
  subject: string | null;
  bodyText: string | null;
  receivedAt: string | null;
  attachments: Array<OpenMailAttachment & { localPath?: string }>;
  candidates: TripCandidate[];
};

export type ExtractResult = {
  data: Extracted;
  model: string;
  request: unknown;
  response: unknown;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
};

const SYSTEM = `You read forwarded travel emails and turn them into structured trip data.

Rules:
- Report times exactly as the booking states them, local to the place. Never convert to UTC.
- A return ticket in the same email is a second segment. Do not invent segments.
- If the email is a receipt, an itinerary and a boarding pass for the same flight, report the flight once.
- Use the attachment text and images as the first source; the mail body is often a forwarding note.
- Fill from_code and to_code with IATA codes. Add the city names you know.
- Set is_travel false for anything with no booking: adverts, newsletters, price alerts.
- Set confidence below 0.8 and needs_review true when a date, a time, a code or a number is unclear.

What each kind means:
- flight, train, bus, ferry: something that moves the traveller. from and to are
  the two ends, depart_local is the departure and arrive_local the arrival.
  For a ferry, carrier_name is the operator and the codes are the two ports.
- hotel: carrier_name is the property name, depart_local is check in and
  arrive_local is check out, from_code and to_code are both the city or nearest
  airport code, address is the street address, booking_ref is the confirmation.
- car: carrier_name is the rental company, depart_local is pick up and
  arrive_local is drop off, from_code is where it is collected and to_code where
  it is returned, address is the desk address.

Merging:
- You get a list of the sender's recent trips. If this email belongs to one of them (the return leg of the same journey, a seat change, a hotel for the same dates), put that trip id in merge_with_trip_id.
- Only merge when the dates and places fit together. When in doubt, return null and let it be a new trip.`;

function buildContent(input: ExtractInput) {
  const parts: any[] = [];
  const lines = [
    `From: ${input.from}`,
    `Received: ${input.receivedAt ?? 'unknown'}`,
    `Subject: ${input.subject ?? '(none)'}`,
    '',
    '--- EMAIL BODY ---',
    (input.bodyText ?? '').slice(0, 20000),
  ];

  for (const att of input.attachments) {
    if (att.parsedText) {
      lines.push('', `--- ATTACHMENT ${att.filename} (${att.extractionMethod}) ---`, att.parsedText.slice(0, 50000));
    } else {
      lines.push('', `--- ATTACHMENT ${att.filename} (${att.contentType}, no text extracted) ---`);
    }
  }

  if (input.candidates.length) {
    lines.push('', '--- SENDER\'S RECENT TRIPS (merge candidates) ---');
    for (const c of input.candidates) {
      lines.push(`id=${c.id} | ${c.startDate ?? '?'} to ${c.endDate ?? '?'} | ${c.route} | refs: ${c.bookingRefs.join(',') || 'none'}`);
    }
  } else {
    lines.push('', '--- SENDER HAS NO RECENT TRIPS ---');
  }

  parts.push({ type: 'input_text', text: lines.join('\n') });
  return parts;
}

/** Images and unreadable PDFs go to the model as files, not as OCR text. */
async function attachFiles(parts: any[], input: ExtractInput) {
  for (const att of input.attachments) {
    if (!att.localPath) continue;
    const isImage = IMAGE_TYPES.test(att.contentType ?? '');
    const isPdf = (att.contentType ?? '').includes('pdf');
    const textFailed = !att.parsedText || OCR_METHODS.has(att.extractionMethod ?? '');
    if (!isImage && !(isPdf && textFailed)) continue;

    const bytes = await readFile(att.localPath);
    if (bytes.byteLength > 18 * 1024 * 1024) continue;
    const b64 = bytes.toString('base64');
    if (isImage) {
      parts.push({ type: 'input_image', image_url: `data:${att.contentType};base64,${b64}`, detail: 'high' });
    } else {
      parts.push({ type: 'input_file', filename: att.filename, file_data: `data:application/pdf;base64,${b64}` });
    }
  }
}

export async function extract(input: ExtractInput, model: string): Promise<ExtractResult> {
  const content = buildContent(input);
  await attachFiles(content, input);

  const request = {
    model,
    instructions: SYSTEM,
    input: [{ role: 'user' as const, content }],
    text: { format: { type: 'json_schema' as const, name: 'trip_extraction', strict: true, schema: tripSchema } },
  };

  const started = Date.now();
  const response = await openai.responses.create(request as any);
  const durationMs = Date.now() - started;

  const text = (response as any).output_text ?? '';
  const data = JSON.parse(text) as Extracted;

  const usage = (response as any).usage ?? {};
  const price = PRICES[model] ?? { in: 0, out: 0 };
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  return {
    data,
    model,
    // Attachment bytes are stripped, so the audit row stays small.
    request: { ...request, input: '[see attachments table]' },
    response: data,
    inputTokens,
    outputTokens,
    costUsd: (inputTokens * price.in + outputTokens * price.out) / 1_000_000,
    durationMs,
  };
}

/** True when the fast model was not sure enough to trust on its own. */
export function shouldEscalate(r: Extracted, input: ExtractInput): boolean {
  if (!r.is_travel) return false;
  if (r.confidence < config.openai.confidenceThreshold) return true;
  if (r.needs_review) return true;
  if (r.segments.length === 0) return true;
  if (r.segments.some((s) => !s.depart_local || !s.from_code || !s.to_code)) return true;
  if (input.attachments.some((a) => OCR_METHODS.has(a.extractionMethod ?? ''))) return true;
  return false;
}
