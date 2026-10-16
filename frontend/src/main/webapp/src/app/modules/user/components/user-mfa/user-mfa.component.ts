import {DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {form, FormField, validate} from '@angular/forms/signals';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from '@angular/material/input';
import {BrowserQRCodeSvgWriter} from '@zxing/library';
import {firstValueFrom} from 'rxjs';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MfaApiService, MfaMethod, MfaPasskeyItem, MfaPasskeyKind, MfaProof, MfaSetup, MfaStatus} from '../../../../api/mfa-api.service';
import {PasskeyService} from '../../../../common/security/passkey.service';
import {MfaConfirmDialogComponent, MfaConfirmDialogData} from './mfa-confirm-dialog/mfa-confirm-dialog.component';
import {mfaCodeError} from './mfa-code';
import checkCircleIcon from '@material-symbols/svg-400/outlined/check_circle-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';
import mobileIcon from '@material-symbols/svg-400/outlined/mobile-fill.svg';
import mailIcon from '@material-symbols/svg-400/outlined/mail-fill.svg';
import passkeyIcon from '@material-symbols/svg-400/outlined/passkey-fill.svg';
import keyboardArrowUpIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_up-fill.svg';
import keyboardArrowDownIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_down-fill.svg';

const QR_CODE_SIZE = 220;
const PASSKEY_NAME_MAX_LENGTH = 100;
const METHOD_COUNT = 3;

/** One row of the page, one per method. */
export type MfaRow = 'app' | 'email' | 'passkey';

const PASSKEY_KIND_LABELS: Record<MfaPasskeyKind, string | null> = {
  DEVICE: 'Gerät',
  SECURITY_KEY: 'Sicherheitsschlüssel',
  UNKNOWN: null
};

function emptyFields() {
  return {appCode: '', emailCode: '', passkeyName: ''};
}

/** The address with everything but its first character before the `@` masked, as the row's summary shows it. */
export function maskEmail(address: string) {
  const at = address.indexOf('@');
  return at <= 0 ? address : address[0] + '***' + address.substring(at);
}

/**
 * The "Zwei-Faktor-Authentifizierung" page of "Mein Konto" - what protects the own login beyond the password. Three
 * methods, which can be used side by side, and any one completes a login:
 *
 * - **Authenticator app.** Setting it up is two steps: a secret is handed out and shown as a QR code, and it only
 *   counts once a code from the app for that secret was accepted - which is also what proves the app was set up
 *   correctly before the next login depends on it. The QR code is drawn here in the browser from the `otpauth://`
 *   address, so the secret goes nowhere but this page; it is shown in writing too, for an app that cannot scan.
 * - **Code by e-mail.** A code is sent to the address on the account and has to be entered. A user with no address
 *   on record is sent to the "Meine Daten" page to add one, instead of being offered a method that cannot work.
 * - **Passkeys.** A passkey completes a login without a code; it is added with a name, and the browser and the
 *   device do the rest (`PasskeyService`). A user can have several.
 *
 * The page opens with a summary - is the account protected, by how many methods, and is the setup fragile - and
 * lists one expandable row per method below it, which holds both the setup and the removal of that method.
 *
 * Every change but the very first setup asks for proof of a method the user has (ADR-0059), so a browser left
 * signed in can neither take the second factor away nor put its own next to the user's. That proof is asked for in
 * one place, `MfaConfirmDialogComponent`, which also runs the change. When the deployment requires a method the
 * last one cannot be removed. A user who has none yet never reaches this page while the requirement is on -
 * `AuthGuardService` sends that session to `LoginMfaSetupComponent` on the login flow instead.
 */
@Component({
  selector: 'tafel-user-mfa',
  templateUrl: 'user-mfa.component.html',
  imports: [
    FormField,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    MatIcon,
    MatFormField,
    MatInput,
    MatLabel,
    MatError,
    MatHint,
    RouterLink,
    DatePipe
  ]
})
export class UserMfaComponent {
  private readonly mfaApiService = inject(MfaApiService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly passkeyService = inject(PasskeyService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private readonly registerIcons = registerSvgIcons({
    'check_circle': checkCircleIcon,
    'warning': warningIcon,
    'mobile': mobileIcon,
    'mail': mailIcon,
    'passkey': passkeyIcon,
    'keyboard_arrow_up': keyboardArrowUpIcon,
    'keyboard_arrow_down': keyboardArrowDownIcon
  });

  private readonly qrContainer = viewChild<ElementRef<HTMLElement>>('qrContainer');
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner');

  /** `null` until the status has been read. */
  status = signal<MfaStatus | null>(null);
  /** Set between "Einrichten" and a code being accepted. */
  appSetup = signal<MfaSetup | null>(null);
  /** A code was sent to set the e-mail method up and has not been entered yet. */
  emailSetupStarted = signal(false);
  working = signal(false);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  /** The rows that are open; all of them start closed. */
  private readonly expandedRows = signal<ReadonlySet<MfaRow>>(new Set());

  /** The secret in groups of four, which is how it is easiest to copy by eye. */
  readonly formattedSecret = computed(() => this.appSetup()?.secret.match(/.{1,4}/g)?.join(' ') ?? '');

  readonly passkeys = computed(() => this.status()?.passkeys ?? []);
  /** Whether this browser can create a passkey at all - one that cannot still lists them. */
  readonly passkeySupported = this.passkeyService.isSupported();

  readonly activeMethodCount = computed(() => {
    const status = this.status();
    return [status?.totpEnabled, status?.emailEnabled, this.passkeys().length > 0].filter(Boolean).length;
  });
  readonly anyMethodEnabled = computed(() => this.activeMethodCount() > 0);
  readonly methodCount = METHOD_COUNT;

  /**
   * What makes the setup fragile, if anything: a single way in that can be lost on its own. Several passkeys on
   * their own are not on this list - each of them is a way in that does not depend on the others.
   */
  readonly weakness = computed<string | null>(() => {
    const status = this.status();
    if (!status || this.activeMethodCount() !== 1) {
      return null;
    }
    if (status.emailEnabled) {
      return 'Nur der Code per E-Mail ist eingerichtet - er ist nur so sicher wie Ihr E-Mail-Postfach. '
        + 'Die Authenticator-App oder ein Passkey wird empfohlen.';
    }
    if (status.totpEnabled) {
      return 'Nur eine Methode ist eingerichtet - ist das Smartphone mit der App nicht zur Hand, kann nur ein '
        + 'Administrator die Zwei-Faktor-Authentifizierung zurücksetzen. Eine zweite Methode wird empfohlen.';
    }
    return this.passkeys().length === 1
      ? 'Nur ein Passkey ist eingerichtet - ist das Gerät nicht zur Hand, kann nur ein Administrator die '
      + 'Zwei-Faktor-Authentifizierung zurücksetzen. Ein zweiter Passkey oder eine weitere Methode wird empfohlen.'
      : null;
  });

  /** Whether the last method is the only thing left, which cannot be removed while the deployment requires one. */
  readonly lastMethodLocked = computed(() => !!this.status()?.required && this.activeMethodCount() === 1);

  readonly maskedEmail = computed(() => {
    const address = this.status()?.emailAddress;
    return address ? maskEmail(address) : null;
  });

  private readonly formModel = signal(emptyFields());
  setupForm = form(this.formModel, (schemaPath) => {
    validate(schemaPath.appCode, ({value}) => mfaCodeError(value()));
    validate(schemaPath.emailCode, ({value}) => mfaCodeError(value()));
    validate(schemaPath.passkeyName, ({value}) => {
      const name = value().trim();
      if (name.length === 0) {
        return {kind: 'required', message: 'Bitte einen Namen eingeben'};
      }
      return name.length <= PASSKEY_NAME_MAX_LENGTH ? null : {kind: 'maxLength', message: `Höchstens ${PASSKEY_NAME_MAX_LENGTH} Zeichen`};
    });
  });

  constructor() {
    this.loadStatus();

    // The container only exists once a setup is shown, so drawing waits for both.
    effect(() => {
      const setup = this.appSetup();
      const container = this.qrContainer()?.nativeElement;
      if (!setup || !container) {
        return;
      }
      const svg = new BrowserQRCodeSvgWriter().write(setup.otpauthUri, QR_CODE_SIZE, QR_CODE_SIZE);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'QR-Code zum Einrichten der Authenticator-App');
      container.replaceChildren(svg);
    });

    // A message sits at the top of the page while the button that caused it may be far below (under the QR code),
    // so it is brought into view instead of appearing where nobody looks.
    effect(() => this.banner()?.nativeElement.scrollIntoView?.({block: 'nearest'}));
  }

  private loadStatus() {
    this.mfaApiService.getStatus().subscribe(status => this.status.set(status));
  }

  // ---- rows

  isExpanded(row: MfaRow) {
    return this.expandedRows().has(row);
  }

  toggleRow(row: MfaRow) {
    const expanded = new Set(this.expandedRows());
    if (!expanded.delete(row)) {
      expanded.add(row);
    }
    this.expandedRows.set(expanded);
  }

  passkeyKindLabel(passkey: MfaPasskeyItem) {
    return passkey.kind ? PASSKEY_KIND_LABELS[passkey.kind] : null;
  }

  // ---- authenticator app

  startAppSetup() {
    this.working.set(true);
    this.clearMessages();
    this.mfaApiService.setup().subscribe({
      next: setup => {
        this.appSetup.set(setup);
        this.working.set(false);
      },
      error: () => this.working.set(false)
    });
  }

  cancelAppSetup() {
    this.appSetup.set(null);
    this.clearMessages();
    this.resetFields();
  }

  enableApp(event: Event) {
    event.preventDefault();
    if (!this.validate('appCode')) {
      return;
    }
    const code = this.code('appCode');
    return this.change('Authenticator-App aktivieren', 'Aktivieren', async proof => {
      await firstValueFrom(this.mfaApiService.enable(code, proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.appSetup.set(null);
      this.toastr.success('Authenticator-App eingerichtet!');
    });
  }

  // ---- e-mail

  startEmailSetup() {
    this.working.set(true);
    this.clearMessages();
    this.mfaApiService.setupEmail(SUPPRESS_ERROR_TOAST_CONTEXT).subscribe({
      next: () => {
        this.emailSetupStarted.set(true);
        this.infoMessage.set('Ein Code wurde an Ihre E-Mail-Adresse gesendet.');
        this.working.set(false);
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
  }

  cancelEmailSetup() {
    this.emailSetupStarted.set(false);
    this.clearMessages();
    this.resetFields();
  }

  enableEmail(event: Event) {
    event.preventDefault();
    if (!this.validate('emailCode')) {
      return;
    }
    const code = this.code('emailCode');
    return this.change('Code per E-Mail aktivieren', 'Aktivieren', async proof => {
      await firstValueFrom(this.mfaApiService.enableEmail(code, proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.emailSetupStarted.set(false);
      this.toastr.success('Code per E-Mail eingerichtet!');
    });
  }

  // ---- passkeys

  /**
   * Adds a passkey: the backend hands out the options, the browser lets the device create the key, and the backend
   * stores it once the proof of an existing method checks out. A prompt the user dismisses is no error of the
   * application, so it is told apart from a refusal by the backend.
   */
  addPasskey(event: Event) {
    event.preventDefault();
    if (!this.validate('passkeyName')) {
      return;
    }
    const name = this.formModel().passkeyName.trim();
    return this.change('Passkey hinzufügen', 'Hinzufügen', async proof => {
      const {options} = await firstValueFrom(this.mfaApiService.setupPasskey(SUPPRESS_ERROR_TOAST_CONTEXT));
      const credential = await this.passkeyService.create(options);
      await firstValueFrom(this.mfaApiService.enablePasskey(credential, name, proof, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success('Passkey hinzugefügt!');
    }, {
      promptError: 'Der Passkey wurde nicht erstellt - der Vorgang wurde abgebrochen, oder dieses Gerät hat bereits einen Passkey '
        + 'für dieses Konto.'
    });
  }

  removePasskey(passkey: MfaPasskeyItem) {
    return this.change(`Passkey "${passkey.name}" entfernen`, 'Entfernen', async proof => {
      await firstValueFrom(this.mfaApiService.disablePasskey(passkey.id, proof!, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success('Passkey entfernt!');
    }, {danger: true});
  }

  // ---- removing a code method

  disable(method: MfaMethod) {
    const label = method === 'TOTP' ? 'Authenticator-App' : 'Code per E-Mail';
    return this.change(`${label} entfernen`, 'Entfernen', async proof => {
      await firstValueFrom(this.mfaApiService.disable(method, proof!, SUPPRESS_ERROR_TOAST_CONTEXT));
      this.toastr.success(`${label} entfernt!`);
    }, {danger: true});
  }

  // ---- shared

  private validate(field: keyof ReturnType<typeof emptyFields>) {
    this.setupForm[field]().markAsTouched();
    return this.setupForm[field]().valid();
  }

  private code(field: 'appCode' | 'emailCode') {
    return this.formModel()[field].replace(/\s/g, '');
  }

  /**
   * Runs one change. The very first method needs no proof and runs at once, with any refusal shown at the top of
   * the page; every other change goes through the confirmation dialog, which asks for the proof, runs the change
   * and answers a refusal itself. Either way the page reads its state again once the change went through.
   */
  private async change(
    title: string,
    confirmLabel: string,
    run: (proof: MfaProof | null) => Promise<void>,
    options: {danger?: boolean; promptError?: string} = {}
  ) {
    const status = this.status();
    if (!status) {
      return;
    }
    this.clearMessages();

    if (!this.anyMethodEnabled()) {
      this.working.set(true);
      try {
        await run(null);
      } catch (error) {
        // What the browser's passkey prompt throws is an Error; a refusal by the backend is not.
        if (error instanceof Error) {
          this.errorMessage.set(options.promptError ?? 'Der Vorgang wurde abgebrochen - bitte erneut versuchen.');
          this.working.set(false);
        } else {
          this.fail(error as HttpErrorResponse);
        }
        return;
      }
    } else {
      const data: MfaConfirmDialogData = {
        title,
        confirmLabel,
        danger: options.danger,
        promptError: options.promptError,
        totpEnabled: status.totpEnabled,
        emailEnabled: status.emailEnabled,
        change: proof => run(proof)
      };
      const confirmed = await firstValueFrom(this.dialog.open(MfaConfirmDialogComponent, {data}).afterClosed());
      if (!confirmed) {
        return;
      }
      this.working.set(true);
    }

    this.resetFields();
    // The answer may have replaced the session (a method that was just set up completes it), so what the session
    // may do is read again.
    await this.authenticationService.loadUserInfo();
    this.loadStatus();
    this.working.set(false);
  }

  private fail(error: HttpErrorResponse) {
    this.errorMessage.set(error.status === 429
      ? 'Bitte einen Moment warten, bevor ein neuer Code angefordert wird!'
      : extractErrorMessage(error));
    this.resetFields();
    this.working.set(false);
  }

  private clearMessages() {
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  private resetFields() {
    this.formModel.set(emptyFields());
    // A form that stays on the page must not greet the user with "required" errors.
    (['appCode', 'emailCode', 'passkeyName'] as const).forEach(field => this.setupForm[field]().reset());
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}
