import { randomInt } from 'node:crypto';

/**
 * No I, L, O, U, 0 or 1: nothing in the set can be confused when a slug is
 * read aloud or typed from a screenshot. U is out so no word can be rude.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function newSlug(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Accepts a slug typed in any case. Lookup itself stays exact. */
export function normaliseSlug(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidSlug(input: string): boolean {
  return /^[A-Z0-9]{4,16}$/.test(normaliseSlug(input));
}
