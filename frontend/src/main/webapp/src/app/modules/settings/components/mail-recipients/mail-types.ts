import {FormControl, Validators} from '@angular/forms';
import {MailTypeEnum, RecipientTypeEnum} from '../../../../api/settings-api.service';

/** What one mail type is, in the words someone choosing its recipients needs. */
export interface MailTypeSpec {
  label: string;
  /** What the mail contains and when it goes out - the tribal knowledge this screen used to require. */
  description: string;
}

export const mailTypeSpecs: Record<MailTypeEnum, MailTypeSpec> = {
  [MailTypeEnum.DAILY_REPORT]: {
    label: 'Tagesreport',
    description: 'Der Tagesreport als PDF: Anzahl der Kunden und Personen, ausgegebene Warenmengen, ' +
      'Mitarbeiter und die Notizen des Ausgabetags. Wird automatisch versendet, sobald der Ausgabetag ' +
      'beendet wird — außer es war kein Kunde registriert.'
  },
  [MailTypeEnum.STATISTICS]: {
    label: 'Statistiken',
    description: 'Die Auswertungen des Ausgabetags als CSV-Dateien, unter anderem Alters- und ' +
      'Länderverteilung. Wird gemeinsam mit dem Tagesreport beim Beenden des Ausgabetags versendet.'
  },
  [MailTypeEnum.RETURN_BOXES]: {
    label: 'Retourkisten',
    description: 'Die retournierten Kisten je Route und Filiale, aufgeschlüsselt nach Kistenart. ' +
      'Wird ebenfalls beim Beenden des Ausgabetags versendet.'
  }
};

/**
 * Whether an address may be stored. Unchanged from when every address was its own input - it is
 * now applied before a chip is created instead of afterwards, so the list only holds what passes.
 */
export function isValidMailAddress(address: string): boolean {
  return new FormControl(address, [Validators.required, Validators.minLength(5), Validators.email]).valid;
}

export const recipientTypeLabels: Record<RecipientTypeEnum, string> = {
  [RecipientTypeEnum.TO]: 'Empfänger (AN)',
  [RecipientTypeEnum.CC]: 'Kopie (CC)',
  [RecipientTypeEnum.BCC]: 'Blindkopie (BCC)'
};
