import {parseContentDispositionFilename} from './content-disposition.util';

describe('parseContentDispositionFilename', () => {

  it('prefers the RFC 5987 filename* parameter over the plain fallback', () => {
    const header = 'inline; filename="benutzerdaten-admin.pdf"; filename*=UTF-8\'\'benutzerdaten-admin.pdf';
    expect(parseContentDispositionFilename(header)).toBe('benutzerdaten-admin.pdf');
  });

  it('percent-decodes the filename* value', () => {
    const header = 'attachment; filename="Einkommensnachweis _M_ller_.pdf"; filename*=UTF-8\'\'Einkommensnachweis%20%22M%C3%BCller%22.pdf';
    expect(parseContentDispositionFilename(header)).toBe('Einkommensnachweis "Müller".pdf');
  });

  it('falls back to the plain quoted filename parameter when there is no filename*', () => {
    expect(parseContentDispositionFilename('attachment; filename="export.csv"')).toBe('export.csv');
  });

  it('falls back to an unquoted plain filename parameter', () => {
    expect(parseContentDispositionFilename('inline; filename=export.csv')).toBe('export.csv');
  });

});
