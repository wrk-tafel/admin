import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {
  CarCreateDialogComponent,
  CarCreateDialogData,
  CarCreateDialogResult
} from './dialogs/car-create-dialog.component';
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
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {
  faCheck,
  faChevronDown,
  faChevronRight,
  faEye,
  faPencil,
  faPlus,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
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
    FaIconComponent,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatTooltipModule,
    TafelReorderHandleComponent,
    TafelInfoTooltipComponent
  ]
})
export class SettingsCarsComponent {
  private readonly carApiService = inject(CarApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);
  private readonly reorderFeedback = inject(ReorderFeedbackService);

  private _cars = signal<CarList | null>(null);
  protected cars = this._cars;
  displayedColumns = ['drag', 'active', 'licensePlate', 'name', 'actions'];

  /**
   * A deactivated car is kept forever - it is what an already recorded food collection points at -
   * so the two are listed apart: the working list holds the cars the Warenerfassung actually
   * offers, and the deactivated ones sit behind a collapsed section instead of padding it out.
   */
  protected activeCars = computed(() => (this.cars()?.cars ?? []).filter(car => car.enabled));
  protected inactiveCars = computed(() => (this.cars()?.cars ?? []).filter(car => !car.enabled));
  protected showInactive = signal(false);

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
      next: data => this._cars.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Fahrzeuge', 'Fehler')
    });
  }

  protected toggleInactive() {
    this.showInactive.set(!this.showInactive());
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
        // A deactivated car leaves the list it was in - unfolding the inactive section shows where
        // it went, rather than letting it look deleted.
        if (!enabled) {
          this.showInactive.set(true);
        }
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
      this.reorderFeedback.announce(`Fahrzeug ${car.name}`, targetIndex, this.activeCars().length);
    }
  }

  /**
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromIndex: number, toIndex: number, keepFocusOnHandle: boolean): CarData | undefined {
    const reordered = [...this.activeCars()];
    if (toIndex < 0 || toIndex >= reordered.length) {
      return undefined;
    }

    moveItemInArray(reordered, fromIndex, toIndex);
    // Only the active cars are sortable, but the whole list is sent: the backend numbers the ids
    // it is given from 1, so leaving the inactive ones out would let them keep sort orders that
    // interleave with the new ones.
    const ordered = [...reordered, ...this.inactiveCars()];
    this._cars.set({cars: ordered}); // optimistic, updates in the background
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragCarHandle-${toIndex}`);
    }

    this.carApiService.reorderCars(ordered.map(car => car.id)).subscribe({
      next: data => {
        this._cars.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragCarHandle-${toIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadCars();
      }
    });

    return reordered[toIndex];
  }

  protected readonly faChevronDown = faChevronDown;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
}
