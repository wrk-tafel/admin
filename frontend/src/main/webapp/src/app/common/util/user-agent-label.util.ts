/**
 * Turns a raw `navigator.userAgent` string into a short, human-friendly "Browser unter OS" label
 * for the push-notification device list - not a full UA parser, just enough to tell this app's
 * realistic device mix (desktop/mobile Chrome, Firefox, Safari, Edge on Windows/macOS/Linux/
 * Android/iOS) apart from each other. Falls back to a generic label if nothing matches or the
 * value is missing (e.g. subscriptions created before this field existed).
 */
export function userAgentLabel(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'Unbekanntes Gerät';
  }

  return `${browserName(userAgent)} unter ${osName(userAgent)}`;
}

export type UserAgentDeviceType = 'mobile' | 'desktop' | 'unknown';

/**
 * Whether a user agent belongs to a phone/tablet or to a computer, so the device list can carry an
 * icon next to each entry - "which of these is my old phone?" is answered faster by a shape than by
 * reading the browser/OS text. Tablets count as mobile: the distinction that matters here is
 * "a device I carry around" versus "a device standing somewhere".
 */
export function userAgentDeviceType(userAgent: string | null | undefined): UserAgentDeviceType {
  if (!userAgent) {
    return 'unknown';
  }
  if (/iPhone|iPad|iPod|Android|Mobile|Tablet/.test(userAgent)) {
    return 'mobile';
  }
  if (/Windows|Mac OS X|Linux|CrOS/.test(userAgent)) {
    return 'desktop';
  }
  return 'unknown';
}

function browserName(userAgent: string): string {
  // Order matters: Edge/Chrome/Opera all include "Safari" and/or "Chrome" in their UA string for
  // legacy compatibility, so the more specific tokens must be checked first.
  if (/Edg\//.test(userAgent)) {
    return 'Edge';
  }
  if (/OPR\//.test(userAgent)) {
    return 'Opera';
  }
  if (/Firefox\//.test(userAgent)) {
    return 'Firefox';
  }
  if (/CriOS\//.test(userAgent)) {
    return 'Chrome';
  }
  if (/Chrome\//.test(userAgent)) {
    return 'Chrome';
  }
  if (/Safari\//.test(userAgent)) {
    return 'Safari';
  }
  return 'Unbekannter Browser';
}

function osName(userAgent: string): string {
  if (/Windows/.test(userAgent)) {
    return 'Windows';
  }
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return 'iOS';
  }
  if (/Mac OS X/.test(userAgent)) {
    return 'macOS';
  }
  if (/Android/.test(userAgent)) {
    return 'Android';
  }
  if (/Linux/.test(userAgent)) {
    return 'Linux';
  }
  return 'unbekanntem System';
}
