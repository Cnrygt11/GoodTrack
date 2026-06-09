/**
 * Safely extracts a human-readable message from an unknown caught error.
 * Use this in every catch block instead of duplicating the instanceof check.
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
