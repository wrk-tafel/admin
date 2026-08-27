/**
 * Extracts the filename from a `Content-Disposition` header value, preferring the RFC 5987
 * `filename*=<charset>''<percent-encoded>` parameter when present - the backend always sets it
 * alongside a plain `filename="..."` fallback (`ContentDispositionUtil`), and it round-trips
 * every character regardless of what the stored filename contains. A naive
 * `header.split('filename')[1].split('=')[1]` breaks against that quoted/dual-parameter shape (it
 * picks up the plain parameter's surrounding quotes literally), which is what happened here -
 * see issue #3438.
 */
export function parseContentDispositionFilename(header: string): string {
  const extended = header.match(/filename\*=[^']*''([^;]+)/i);
  if (extended) {
    return decodeURIComponent(extended[1].trim());
  }

  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : header.trim();
}
