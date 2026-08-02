import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {CarCreateDialogComponent} from './dialogs/car-create-dialog.component';
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
import {faCheck, faEye, faEyeSlash, faGripVertical, faPencil, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

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
    CdkDragHandle
  ]
})
export class SettingsCarsComponent {
  private readonly carApiService = inject(CarApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _cars = signal<CarList | null>(null);
  protected cars = this._cars;
  displayedColumns = ['drag', 'active', 'licensePlate', 'name', 'actions'];

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
      error: () => this.toastr.error('Fehler beim Laden der Autos', 'Fehler')
    });
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
      licensePlate: this.licensePlateControl.value,
      name: this.nameControl.value
    };

    this.carApiService.updateCar(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Auto gespeichert', 'Erfolgreich');
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
        this.toastr.success(`Auto ${car.name} geändert`, 'Erfolgreich');
        this.loadCars();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.carApiService.updateCar(updatedCar.id, updatedCar).subscribe(observer);
  }

  protected addCar() {
    const dialogRef = this.dialog.open(CarCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: CarData | undefined) => {
      if (created) {
        this.carApiService.createCar(created).subscribe({
          next: () => {
            this.toastr.success('Auto erstellt', 'Erfolgreich');
            this.loadCars();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected drop(event: CdkDragDrop<CarData[]>) {
    const reordered = [...(this.cars()?.cars ?? [])];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this._cars.set({cars: reordered}); // optimistic, updates in the background

    this.carApiService.reorderCars(reordered.map(car => car.id)).subscribe({
      next: data => this._cars.set(data),
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadCars();
      }
    });
  }

  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
  protected readonly faGripVertical = faGripVertical;
}
