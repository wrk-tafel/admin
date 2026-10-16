/** Six digits, as an authenticator app shows them and as the e-mail carries them (an app may put a space in the middle). */
export function mfaCodeError(value: string) {
  const code = value.replace(/\s/g, '');
  if (code.length === 0) {
    return {kind: 'required', message: 'Bitte den Code eingeben'};
  }
  return /^\d{6}$/.test(code) ? null : {kind: 'codeFormat', message: 'Der Code besteht aus 6 Ziffern'};
}
