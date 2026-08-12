import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {FoodCategoryCreateDialogComponent} from './dialogs/food-category-create-dialog.component';
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
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faBoxOpen, faCheck, faEye, faEyeSlash, faPencil, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
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
import {RouterLink} from '@angular/router';

@Component({
  selector: 'tafel-settings-food-categories',
  templateUrl: 'settings-food-categories.component.html',
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
    TafelReorderHandleComponent,
    MatTooltipModule,
    RouterLink
  ]
})
export class SettingsFoodCategoriesComponent {
  private readonly foodCategoriesApiService = inject(FoodCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private _foodCategories = signal<FoodCategory[]>([]);
  protected foodCategories = this._foodCategories;
  displayedColumns = ['drag', 'active', 'name', 'weightPerUnit', 'actions'];

  protected editingId = signal<number | null>(null);
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  protected weightPerUnitControl = new FormControl<number | null>(null);
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private nameInputMobile = viewChild<ElementRef<HTMLInputElement>>('nameInputMobile');

  constructor() {
    this.loadFoodCategories();

    effect(() => {
      this.nameInput()?.nativeElement.focus();
      this.nameInputMobile()?.nativeElement.focus();
    });
  }

  private loadFoodCategories() {
    this.foodCategoriesApiService.getAllFoodCategories().subscribe({
      next: data => this._foodCategories.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Waren-Kategorien', 'Fehler')
    });
  }

  protected startEdit(category: FoodCategory) {
    this.editingId.set(category.id);
    this.nameControl.setValue(category.name);
    this.weightPerUnitControl.setValue(category.weightPerUnit);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(category: FoodCategory) {
    const updated: FoodCategory = {
      ...category,
      name: this.nameControl.value,
      weightPerUnit: this.weightPerUnitControl.value
    };

    this.foodCategoriesApiService.updateFoodCategory(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Lebensmittelkategorie gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadFoodCategories();
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected toggleFoodCategoryVisibility(category: FoodCategory, enabled: boolean) {
    const updatedCategory = {
      ...category,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Lebensmittelkategorie ${category.name} geändert`, 'Erfolgreich');
        this.loadFoodCategories();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.foodCategoriesApiService.updateFoodCategory(updatedCategory.id, updatedCategory).subscribe(observer);
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

  protected drop(event: CdkDragDrop<FoodCategory[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveFoodCategory(index: number, offset: number) {
    const targetIndex = index + offset;
    const moved = this.reorder(index, targetIndex, true);

    if (moved) {
      this.reorderFeedback.announce(`Waren-Kategorie ${moved.name}`, targetIndex, (this.foodCategories()).length);
    }
  }

  /**
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromIndex: number, toIndex: number, keepFocusOnHandle: boolean): FoodCategory | undefined {
    const reordered = [...(this.foodCategories())];
    if (toIndex < 0 || toIndex >= reordered.length) {
      return undefined;
    }

    moveItemInArray(reordered, fromIndex, toIndex);
    this._foodCategories.set(reordered); // optimistic, updates in the background
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragFoodCategoryHandle-${toIndex}`);
    }

    this.foodCategoriesApiService.reorderFoodCategories(reordered.map(category => category.id)).subscribe({
      next: data => {
        this._foodCategories.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragFoodCategoryHandle-${toIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadFoodCategories();
      }
    });

    return reordered[toIndex];
  }

  protected addFoodCategory() {
    const dialogRef = this.dialog.open(FoodCategoryCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: FoodCategory | undefined) => {
      if (created) {
        this.foodCategoriesApiService.createFoodCategory(created).subscribe({
          next: () => {
            this.toastr.success('Lebensmittelkategorie erstellt', 'Erfolgreich');
            this.loadFoodCategories();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
}
