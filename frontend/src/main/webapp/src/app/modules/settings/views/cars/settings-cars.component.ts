import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {
  CarCreateDialogComponent,
  CarCreateDialogData,
  CarCreateDialogResult
} from './dialogs/car-create-dialog.component';
import {
  CarDeleteConfirmDialogComponent,
  CarDeleteConfirmDialogData
} from './dialogs/car-delete-confirm-dialog.component';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {CarApiService, CarData, CarList} from '../../../../api/car-api.service';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import deleteIcon from '@material-symbols/svg-400/outlined/delete-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import localShippingIcon from '@material-symbols/svg-400/outlined/local_shipping-fill.svg';
import {
  TafelReorderHandleComponent
} from '../../../../common/components/tafel-reorder-handle/tafel-reorder-handle.component';
import {
  ReorderFeedbackService
} from '../../../../common/components/tafel-reorder-handle/reorder-feedback.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {
  TafelInfoTooltipComponent
} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';
import {normalizeLicensePlate} from './license-plate';

@Component({
  selector: 'tafel-settings-cars',
  templateUrl: 'settings-cars.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatTooltipModule,
    TafelReorderHandleComponent,
    TafelInfoTooltipComponent,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent
  ]
})
export class SettingsCarsComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    check: checkIcon,
    close: closeIcon,
    delete: deleteIcon,
    edit: editIcon,
    local_shipping: localShippingIcon
  });

  private readonly carApiService = inject(CarApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly reorderFeedback = inject(ReorderFeedbackService);

  private _cars = signal<CarList | null>(null);
  protected cars = this._cars;
  displayedColumns = ['drag', 'active', 'licensePlate', 'name', 'actions'];

  protected readonly loaded = signal(false);
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');
  /**
   * A deactivated car is kept forever - it is what an already recorded food collection points at -
   * so the list only ever grows. The filter is what keeps the working list to the cars the
   * Warenerfassung actually offers.
   */
  protected readonly visibleCars = computed(() =>
    (this.cars()?.cars ?? []).filter(car => matchesEnabledFilter(car.enabled, this.enabledFilter()))
  );
  protected readonly enabledCount = computed(() => (this.cars()?.cars ?? []).filter(car => car.enabled).length);
  protected readonly totalCount = computed(() => (this.cars()?.cars ?? []).length);

  protected editingId = signal<number | null>(null);
  protected licensePlateControl = new FormControl<string>('', {nonNullable: true});
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  private licensePlateInput = viewChild<ElementRef<HTMLInputElement>>('licensePlateInput');
  private licensePlateInputMobile = viewChild<ElementRef<HTMLInputElement>>('licensePlateInputMobile');

  constructor() {
    this.loadCars();

    effect(() => {
      this.licensePlateInput()?.nativeElement.focus();
      this.licensePlateInputMobile()?.nativeElement.focus();
    });
  }

  private loadCars() {
    this.carApiService.getAllCars().subscribe({
      next: data => {
        this._cars.set(data);
        this.loaded.set(true);
      },
      error: () => {
        this.loaded.set(true);
        this.toastr.error('Fehler beim Laden der Fahrzeuge', 'Fehler');
      }
    });
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

  /** Uppercases while typing rather than on save, so what is stored is what the admin saw. */
  protected uppercaseLicensePlate() {
    const uppercased = this.licensePlateControl.value.toUpperCase();
    if (uppercased !== this.licensePlateControl.value) {
      this.licensePlateControl.setValue(uppercased);
    }
  }

  protected startEdit(car: CarData) {
    this.editingId.set(car.id);
    this.licensePlateControl.setValue(car.licensePlate);
    this.nameControl.setValue(car.name);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(car: CarData) {
    const updated: CarData = {
      ...car,
      licensePlate: normalizeLicensePlate(this.licensePlateControl.value),
      name: this.nameControl.value.trim()
    };

    this.carApiService.updateCar(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Fahrzeug gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadCars();
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected toggleCarVisibility(car: CarData, enabled: boolean) {
    const updatedCar = {
      ...car,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Fahrzeug ${car.name} ${enabled ? 'aktiviert' : 'deaktiviert'}`, 'Erfolgreich');
        this.loadCars();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.carApiService.updateCar(updatedCar.id, updatedCar).subscribe(observer);
  }

  protected addCar() {
    const data: CarCreateDialogData = {existingCars: this.cars()?.cars ?? []};
    const dialogRef = this.dialog.open(CarCreateDialogComponent, {
      width: '600px',
      data
    });

    dialogRef.afterClosed().subscribe((result: CarCreateDialogResult | undefined) => {
      if (result?.reactivate) {
        this.toggleCarVisibility(result.reactivate, true);
      } else if (result?.create) {
        this.carApiService.createCar(result.create).subscribe({
          next: () => {
            this.toastr.success('Fahrzeug erstellt', 'Erfolgreich');
            this.loadCars();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  /**
   * A car is hard-deleted rather than just disabled, so this asks first - and the backend still
   * rejects it with a 409 if the car turns out to be referenced by a recorded food collection,
   * which the confirm dialog can't know in advance.
   */
  protected deleteCar(car: CarData) {
    const data: CarDeleteConfirmDialogData = {carName: car.name};
    this.dialog.open(CarDeleteConfirmDialogComponent, {data})
      .afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return;
        }

        this.carApiService.deleteCar(car.id).subscribe({
          next: () => {
            this.toastr.success(`Fahrzeug ${car.name} gelöscht`, 'Erfolgreich');
            this.loadCars();
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Löschen fehlgeschlagen')
        });
      });
  }

  /**
   * Without this the table rebuilds every row whenever the list is replaced - which a reorder does
   * twice, optimistically and again from the response - and the rebuild throws away the row that
   * currently has focus. Keyed by id, the existing rows are moved instead, so the handle the
   * keyboard is on survives its own reorder.
   */
  protected trackById(index: number, item: {id: number}): number {
    return item.id;
  }

  protected drop(event: CdkDragDrop<CarData[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveCar(index: number, offset: number) {
    const targetIndex = index + offset;
    const car = this.reorder(index, targetIndex, true);

    if (car) {
      this.reorderFeedback.announce(`Fahrzeug ${car.name}`, targetIndex, this.visibleCars().length);
    }
  }

  /**
   * Both indices count the *displayed* cars, which under an active filter are only some of them -
   * they are translated into the full list before the move, so a car filtered out of view keeps its
   * place instead of being reordered by a move it isn't part of. Moving past such a car therefore
   * jumps over it, which is exactly what the visible list shows afterwards.
   *
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromVisibleIndex: number, toVisibleIndex: number, keepFocusOnHandle: boolean): CarData | undefined {
    const visible = this.visibleCars();
    if (toVisibleIndex < 0 || toVisibleIndex >= visible.length) {
      return undefined;
    }

    const reordered = [...(this.cars()?.cars ?? [])];
    const fromIndex = reordered.findIndex(car => car.id === visible[fromVisibleIndex].id);
    const toIndex = reordered.findIndex(car => car.id === visible[toVisibleIndex].id);

    moveItemInArray(reordered, fromIndex, toIndex);
    // The whole list is sent: the backend numbers the ids it is given from 1, so leaving the ones
    // currently filtered out would let them keep sort orders that interleave with the new ones.
    this._cars.set({cars: reordered}); // optimistic, updates in the background
    // The handles are keyed by the position in the displayed list, not in the full one.
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragCarHandle-${toVisibleIndex}`);
    }

    this.carApiService.reorderCars(reordered.map(car => car.id)).subscribe({
      next: data => {
        this._cars.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragCarHandle-${toVisibleIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadCars();
      }
    });

    return reordered[toIndex];
  }

}
