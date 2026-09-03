import {Component, computed, effect, inject, signal} from '@angular/core';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import mailIcon from '@material-symbols/svg-400/outlined/mail-fill.svg';

@Component({
  selector: 'tafel-send-mails',
  templateUrl: 'send-mails.component.html',
  providers: [DatePipe],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    MatCardFooter
  ]
})
export class SendMailsComponent {
  private readonly registerIcons = registerSvgIcons({mail: mailIcon});

  private readonly distributionApiService = inject(DistributionApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly datePipe = inject(DatePipe);

  readonly distributions = signal<DistributionItem[]>([]);
  readonly selectedDistribution = signal<DistributionItem | null>(null);

  /**
   * Free-typed override text for the distribution autocomplete - present only while the user is
   * actively narrowing the list; absent (falling back to the selected distribution's label)
   * once a selection commits or the field is left without one - same pattern as the customer
   * form's country autocomplete.
   */
  private readonly distributionFilterOverride = signal<string | null>(null);

  distributionDisplayText = computed(() =>
    this.distributionFilterOverride() ?? this.distributionLabel(this.selectedDistribution()));

  // Distributions accumulate for as long as the Tafel runs, so - unlike a small, static dropdown -
  // this list gets an autocomplete rather than a plain select.
  distributionOptions = computed(() => {
    const term = this.distributionDisplayText().trim().toLowerCase();
    const distributions = this.distributions();
    return term ? distributions.filter(distribution => this.distributionLabel(distribution).toLowerCase().includes(term)) : distributions;
  });

  distributionLabel(distribution: DistributionItem | null): string {
    return distribution ? this.datePipe.transform(distribution.startedAt, 'dd.MM.yyyy') ?? '' : '';
  }

  /**
   * `MatAutocompleteTrigger` fires its `ControlValueAccessor` onChange - wired to `(ngModelChange)`
   * - with a selected option's raw value on selection, not just with typed text; that runs *before*
   * `(optionSelected)` (see `_setValueAndClose` in Angular Material's autocomplete source), so a
   * selection would otherwise briefly overwrite the filter override with a `DistributionItem`
   * object instead of a string. `distributionOptions` calls `.trim()` on that override to build the
   * filtered list, so a non-string override throws there - which can leave the panel showing no
   * options at all if anything reads the computed signal in that window (#3654). Only genuinely
   * typed text narrows the list; a selection is `onDistributionSelected`'s job.
   */
  onDistributionInput(value: string | DistributionItem): void {
    if (typeof value !== 'string') {
      return;
    }
    this.distributionFilterOverride.set(value);
  }

  onDistributionSelected(distribution: DistributionItem): void {
    this.selectedDistribution.set(distribution);
    this.distributionFilterOverride.set(null);
  }

  onDistributionBlur(): void {
    this.distributionFilterOverride.set(null);
  }

  /**
   * `MatAutocompleteTrigger` writes a selected option's raw value straight into the native input
   * itself - bypassing `distributionDisplayText` - whenever the bound value changes, and also
   * whenever it doesn't (e.g. re-picking the already-selected option): Angular's own template
   * binding then skips the write-back because `distributionDisplayText()` didn't change, leaving
   * the raw value's `toString()` ("[object Object]") stuck in the field. `displayWith` is what
   * `MatAutocompleteTrigger` itself calls to render any value, selection included, so routing it
   * through the same label function closes that gap. Our own writes already pass a formatted
   * string through unchanged.
   */
  protected readonly distributionAutocompleteDisplay = (value: DistributionItem | string | null): string =>
    typeof value === 'string' ? value : this.distributionLabel(value);

  initialLoadEffect = effect(() => {
    this.distributionApiService.getDistributions().subscribe((response) => {
      const distributions = response.items;
      this.distributions.set(distributions);

      if (distributions.length > 0) {
        this.selectedDistribution.set(distributions[0]);
      }
    });
  });

  sendMails() {
    const observer = {
      next: () => {
        this.toastr.success('E-Mails wurden erneut verschickt!');
      },
      error: () => {
        this.toastr.error('Senden der E-Mails fehlgeschlagen!');
      },
    };
    const selectedDist = this.selectedDistribution();
    if (selectedDist) {
      this.distributionApiService.sendMails(selectedDist.id).subscribe(observer);
    }
  }

}
