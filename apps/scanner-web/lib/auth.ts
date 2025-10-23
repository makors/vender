import { timingSafeEqual } from "crypto";

export const ACCESS_COOKIE_NAME = "vender_scanner_access";
const encoder = new TextEncoder();

export function getConfiguredAccessCode(): string | undefined {
  return process.env.SCANNER_ACCESS_CODE;
}

export function isAuthorized(code: string | undefined | null): boolean {
  const expected = getConfiguredAccessCode();
  if (!expected || !code) {
    return false;
  }

  const providedBytes = encoder.encode(code);
  const expectedBytes = encoder.encode(expected);

  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  try {
    return timingSafeEqual(providedBytes, expectedBytes);
  } catch (error) {
    return false;
  }
}

export function sanitizeAccessCode(input: string): string {
  return input.trim();
}
