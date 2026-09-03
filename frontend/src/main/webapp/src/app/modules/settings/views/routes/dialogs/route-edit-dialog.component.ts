import {ChangeDetectorRef, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import type {Observable} from 'rxjs';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';
import {MatIcon} from '@angular/material/icon';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {RouteData, RouteStopData} from '../../../../../api/route-api.service';
import {ShopItem} from '../../../../../api/shop-api.service';
import {registerSvgIcons} from '../../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';

export interface RouteEditDialogData {
  route?: RouteData;
  shops: ShopItem[];
}

/** One stop's raw form value, before it is validated into a `RouteStopData`. */
interface StopFormValue {
  time?: string | null;
  shopId?: number | null;
  description?: string | null;
}

interface StopOrderPreviewItem {
  key: string;
  timeLabel: string;
  label: string;
}

// Gaps this short or this long between two neighboring stops are rarely intentional - a route
// visits shops minutes apart, not seconds or half a day apart, so both ends are worth a second
// look before saving (#3240).
const SHORT_GAP_WARNING_MINUTES = 3;
const LONG_GAP_WARNING_MINUTES = 180;

// The backend sends a LocalTime ("14:00:00"); a freshly typed <input type="time"> value is
// "14:00" already - both are safe to slice to "HH:mm".
function timeLabel(time: string): string {
  return time.substring(0, 5);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = timeLabel(time).split(':').map(Number);
  return hours * 60 + minutes;
}

@Component({
  selector: 'tafel-route-edit-dialog',
  templateUrl: 'route-edit-dialog.component.html',
  imports: [
    TafelDialogComponent,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButton,
    MatTooltip,
    MatIcon
  ]
})
export class RouteEditDialogComponent {
  private readonly registerIcons = registerSvgIcons({add: addIcon, delete: deleteIcon, warning: warningIcon});

  readonly dialogRef = inject(MatDialogRef<RouteEditDialogComponent>);
  readonly data: RouteEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);

  protected readonly title = this.data.route ? 'Route bearbeiten' : 'Route anlegen';
  protected readonly shops = this.data.shops;
  private readonly shopsById = new Map(this.shops.map(shop => [shop.id, shop]));

  /**
   * Free-typed override text for a stop's shop autocomplete, keyed by the stop's index - present
   * only while the user is actively narrowing the list; absent (falling back to the stop's
   * currently committed shop) once a selection commits, on blur without one, or on initial load.
   * Same pattern as the customer form's country autocomplete, so a half-typed search never
   * overwrites - or gets validated as - the actual selection.
   */
  private readonly shopFilterOverrides = signal<Map<number, string>>(new Map());

  form = this.fb.group({
    id: [this.data.route?.id],
    number: [this.data.route?.number ?? null, [Validators.required, Validators.min(0.1)]],
    name: [this.data.route?.name ?? '', [Validators.required]],
    note: [this.data.route?.note ?? ''],
    enabled: [this.data.route?.enabled ?? true],
    stops: this.fb.array((this.data.route?.stops ?? []).map(stop => this.createStopGroup(stop)))
  });

  private createStopGroup(stop?: RouteStopData) {
    return this.fb.group({
      time: [stop?.time ?? '', [Validators.required]],
      shopId: [stop?.shopId ?? null],
      description: [stop?.description ?? '']
    });
  }

  get stops(): FormArray {
    return this.form.get('stops') as FormArray;
  }

  // Fed by the stops FormArray's own valueChanges rather than read once, so the live preview and
  // the warnings below react to every keystroke - typed time, picked shop, added/removed stop -
  // without needing a manual detectChanges() call of their own.
  private readonly stopsValue = toSignal(
    this.stops.valueChanges as Observable<StopFormValue[]>,
    {initialValue: this.stops.value as StopFormValue[]}
  );

  // Every stop with a time, in the order the driver will actually drive it - saving sorts by time
  // server-side, so this is what the dialog shows ahead of that instead of the entry order (#3240).
  private readonly timeSortedStops = computed(() =>
    this.stopsValue()
      .map((stop, index): StopFormValue & {key: string} => ({...stop, key: `stop-${index}`}))
      .filter(stop => !!stop.time)
      .sort((a, b) => timeLabel(a.time as string).localeCompare(timeLabel(b.time as string)))
  );

  protected readonly orderedStopsPreview = computed<StopOrderPreviewItem[]>(() =>
    this.timeSortedStops().map(stop => ({
      key: stop.key,
      timeLabel: timeLabel(stop.time as string),
      label: this.stopLabel(stop)
    }))
  );

  // Advisory only - none of these block save(), the backend still rejects a duplicate time/shop on
  // its own. They exist so a typo is caught while editing rather than after a round trip (#3240).
  protected readonly stopWarnings = computed<string[]>(() => {
    const stops = this.stopsValue();
    const warnings: string[] = [];

    const missingTimeCount = stops.filter(stop => !stop.time).length;
    if (missingTimeCount === 1) {
      warnings.push('1 Stopp hat noch keine Uhrzeit.');
    } else if (missingTimeCount > 1) {
      warnings.push(`${missingTimeCount} Stopps haben noch keine Uhrzeit.`);
    }

    const shopCounts = new Map<number, number>();
    stops.forEach(stop => {
      if (stop.shopId != null) {
        shopCounts.set(stop.shopId, (shopCounts.get(stop.shopId) ?? 0) + 1);
      }
    });
    shopCounts.forEach((count, shopId) => {
      if (count > 1) {
        const shopName = this.shopsById.get(shopId)?.name ?? 'Eine Filiale';
        warnings.push(`${shopName} ist ${count}-mal als Stopp eingetragen.`);
      }
    });

    const timed = this.timeSortedStops();
    for (let i = 1; i < timed.length; i++) {
      const gapMinutes = timeToMinutes(timed[i].time as string) - timeToMinutes(timed[i - 1].time as string);
      if (gapMinutes <= SHORT_GAP_WARNING_MINUTES || gapMinutes >= LONG_GAP_WARNING_MINUTES) {
        const from = `${timeLabel(timed[i - 1].time as string)} (${this.stopLabel(timed[i - 1])})`;
        const to = `${timeLabel(timed[i].time as string)} (${this.stopLabel(timed[i])})`;
        warnings.push(`Zeitabstand zwischen ${from} und ${to} wirkt ungewöhnlich (${gapMinutes} Min.) — bitte prüfen.`);
      }
    }

    return warnings;
  });

  private stopLabel(stop: StopFormValue): string {
    const shop = stop.shopId != null ? this.shopsById.get(stop.shopId) : undefined;
    if (shop) {
      return `${shop.number} - ${shop.name}`;
    }
    return stop.description?.trim() ? stop.description.trim() : 'Ohne Filiale';
  }

  /**
   * A stop's shop field, an autocomplete rather than a plain select since a route can have dozens
   * of stops and the shop list only grows: unset shows blank (matching the country autocomplete's
   * "nothing chosen yet" look) rather than a literal "Keine Filiale" placeholder text, so the
   * unfiltered option list - "Keine Filiale" itself included - is what a click on an empty field
   * shows.
   */
  protected shopDisplayText(index: number): string {
    const override = this.shopFilterOverrides().get(index);
    if (override !== undefined) {
      return override;
    }
    const shopId = this.stops.at(index).get('shopId')?.value ?? null;
    const shop = shopId != null ? this.shopsById.get(shopId) : undefined;
    return shop ? this.shopOptionLabel(shop) : '';
  }

  protected shopOptions(index: number): (ShopItem | null)[] {
    const options: (ShopItem | null)[] = [null, ...this.shops];
    const term = this.shopDisplayText(index).trim().toLowerCase();
    return term ? options.filter(shop => this.shopOptionLabel(shop).toLowerCase().includes(term)) : options;
  }

  protected shopOptionLabel(shop: ShopItem | null): string {
    return shop ? `${shop.number} - ${shop.name}` : 'Keine Filiale';
  }

  protected onShopInput(index: number, value: string) {
    this.setShopFilterOverride(index, value);
  }

  protected onShopSelected(index: number, shop: ShopItem | null) {
    this.stops.at(index).get('shopId')?.setValue(shop?.id ?? null);
    this.setShopFilterOverride(index, null);
  }

  protected onShopBlur(index: number) {
    this.stops.at(index).get('shopId')?.markAsTouched();
    this.setShopFilterOverride(index, null);
  }

  private setShopFilterOverride(index: number, value: string | null) {
    this.shopFilterOverrides.update(map => {
      const next = new Map(map);
      if (value === null) {
        next.delete(index);
      } else {
        next.set(index, value);
      }
      return next;
    });
  }

  addStop() {
    this.stops.push(this.createStopGroup());
    this.stops.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();

    // The new stop is appended below the dialog's scroll fold, where its empty inputs would sit
    // hidden under the action bar - looking like the click did nothing. Reveal it once rendered.
    const newStopIndex = this.stops.length - 1;
    setTimeout(() => document.querySelector(`[testid="route-stop-${newStopIndex}"]`)?.scrollIntoView({block: 'nearest'}));
  }

  removeStop(index: number) {
    this.stops.removeAt(index);
    this.stops.updateValueAndValidity();
    this.form.updateValueAndValidity();
    this.cd.detectChanges();

    // Every remaining stop's index shifts by one from here on - a leftover override would end up
    // narrowing a different stop's shop list than the one it was typed into.
    this.shopFilterOverrides.set(new Map());
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
    } else {
      this.dialogRef.close(this.form.value as RouteData);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

}
