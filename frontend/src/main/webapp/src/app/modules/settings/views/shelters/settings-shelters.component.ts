import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ShelterEditDialogComponent} from './dialogs/shelter-edit-dialog.component';
import {ShelterDetailsDialogComponent} from './dialogs/shelter-details-dialog.component';
import {FormatShelterAddressPipe} from '../../../../common/pipes/format-shelter-address.pipe';
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
import {ShelterApiService, ShelterItem, ShelterListResponse} from '../../../../api/shelter-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {faEye, faEyeSlash, faMagnifyingGlass, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {
  TafelReorderHandleComponent
} from '../../../../common/components/tafel-reorder-handle/tafel-reorder-handle.component';
import {
  ReorderFeedbackService
} from '../../../../common/components/tafel-reorder-handle/reorder-feedback.service';

@Component({
  selector: 'tafel-settings-shelters',
  templateUrl: 'settings-shelters.component.html',
  imports: [
    FormatShelterAddressPipe,
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
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TafelReorderHandleComponent,
    MatTooltipModule
  ]
})
export class SettingsSheltersComponent {
  private readonly shelterApiService = inject(ShelterApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private _shelters = signal<ShelterListResponse | null>(null);
  protected shelters = this._shelters;
  displayedColumns = ['drag', 'active', 'name', 'address', 'persons', 'actions'];

  constructor() {
    this.loadShelters();
  }

  private loadShelters() {
    this.shelterApiService.getAllShelters().subscribe({
      next: data => this._shelters.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Notschlafstellen', 'Fehler')
    });
  }

  protected editShelter(shelter: ShelterItem) {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {shelter},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: ShelterItem | undefined) => {
      if (updated) {
        this.shelterApiService.updateShelter(updated.id, updated).subscribe({
          next: () => {
            this.toastr.success('Notschlafstelle gespeichert', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected toggleShelterVisibility(shelter: ShelterItem, enabled: boolean) {
    const updatedShelter = {
      ...shelter,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Notschlafstelle ${shelter.name} geändert`, 'Erfolgreich');
        this.loadShelters();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.shelterApiService.updateShelter(updatedShelter.id, updatedShelter).subscribe(observer);
  }

  protected addShelter() {
    const dialogRef = this.dialog.open(ShelterEditDialogComponent, {
      data: {shelter: undefined as any},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: any) => {
      if (created) {
        this.shelterApiService.createShelter(created).subscribe({
          next: () => {
            this.toastr.success('Notschlafstelle erstellt', 'Erfolgreich');
            this.loadShelters();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected viewShelterDetails(shelter: ShelterItem) {
    this.dialog.open(ShelterDetailsDialogComponent, {
      data: {shelter},
      width: '600px'
    });
  }

  protected drop(event: CdkDragDrop<ShelterItem[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveShelter(index: number, offset: number) {
    const targetIndex = index + offset;
    const moved = this.reorder(index, targetIndex, true);

    if (moved) {
      this.reorderFeedback.announce(`Notschlafstelle ${moved.name}`, targetIndex, (this.shelters()?.shelters ?? []).length);
    }
  }

  /**
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromIndex: number, toIndex: number, keepFocusOnHandle: boolean): ShelterItem | undefined {
    const reordered = [...(this.shelters()?.shelters ?? [])];
    if (toIndex < 0 || toIndex >= reordered.length) {
      return undefined;
    }

    moveItemInArray(reordered, fromIndex, toIndex);
    this._shelters.set({shelters: reordered}); // optimistic, updates in the background
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragShelterHandle-${toIndex}`);
    }

    this.shelterApiService.reorderShelters(reordered.map(shelter => shelter.id)).subscribe({
      next: data => {
        this._shelters.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragShelterHandle-${toIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadShelters();
      }
    });

    return reordered[toIndex];
  }

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
}
