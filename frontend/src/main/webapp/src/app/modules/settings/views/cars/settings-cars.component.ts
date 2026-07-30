import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {CarEditDialogComponent} from './dialogs/car-edit-dialog.component';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
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
import {faEye, faEyeSlash, faGripVertical, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
  selector: 'tafel-settings-cars',
  templateUrl: 'settings-cars.component.html',
  imports: [
    MatCard,
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

  constructor() {
    this.loadCars();
  }

  private loadCars() {
    this.carApiService.getAllCars().subscribe({
      next: data => this._cars.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Autos', 'Fehler')
    });
  }

  protected editCar(car: CarData) {
    const dialogRef = this.dialog.open(CarEditDialogComponent, {
      data: {car},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: CarData | undefined) => {
      if (updated) {
        this.carApiService.updateCar(updated.id, updated).subscribe({
          next: () => {
            this.toastr.success('Auto gespeichert', 'Erfolgreich');
            this.loadCars();
          },
          error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
        });
      }
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
    const dialogRef = this.dialog.open(CarEditDialogComponent, {
      data: {car: undefined as any},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: any) => {
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
  protected readonly faGripVertical = faGripVertical;
}
