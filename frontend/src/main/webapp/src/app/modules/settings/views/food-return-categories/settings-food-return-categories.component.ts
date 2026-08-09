import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {FoodReturnCategoryCreateDialogComponent} from './dialogs/food-return-category-create-dialog.component';
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
import {FoodReturnCategoriesApiService, FoodReturnCategory} from '../../../../api/food-return-categories-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faCheck, faEye, faEyeSlash, faPencil, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
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

@Component({
  selector: 'tafel-settings-food-return-categories',
  templateUrl: 'settings-food-return-categories.component.html',
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
    MatTooltipModule
  ]
})
export class SettingsFoodReturnCategoriesComponent {
  private readonly foodReturnCategoriesApiService = inject(FoodReturnCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private _foodReturnCategories = signal<FoodReturnCategory[]>([]);
  protected foodReturnCategories = this._foodReturnCategories;
  displayedColumns = ['drag', 'active', 'name', 'actions'];

  protected editingId = signal<number | null>(null);
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private nameInputMobile = viewChild<ElementRef<HTMLInputElement>>('nameInputMobile');

  constructor() {
    this.loadFoodReturnCategories();

    effect(() => {
      this.nameInput()?.nativeElement.focus();
      this.nameInputMobile()?.nativeElement.focus();
    });
  }

  private loadFoodReturnCategories() {
    this.foodReturnCategoriesApiService.getAllFoodReturnCategories().subscribe({
      next: data => this._foodReturnCategories.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Retour-Kategorien', 'Fehler')
    });
  }

  protected startEdit(category: FoodReturnCategory) {
    this.editingId.set(category.id);
    this.nameControl.setValue(category.name);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(category: FoodReturnCategory) {
    const updated: FoodReturnCategory = {
      ...category,
      name: this.nameControl.value
    };

    this.foodReturnCategoriesApiService.updateFoodReturnCategory(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Retour-Kategorie gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadFoodReturnCategories();
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected toggleFoodReturnCategoryVisibility(category: FoodReturnCategory, enabled: boolean) {
    const updatedCategory = {
      ...category,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Retour-Kategorie ${category.name} geändert`, 'Erfolgreich');
        this.loadFoodReturnCategories();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.foodReturnCategoriesApiService.updateFoodReturnCategory(updatedCategory.id, updatedCategory).subscribe(observer);
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

  protected drop(event: CdkDragDrop<FoodReturnCategory[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveFoodReturnCategory(index: number, offset: number) {
    const targetIndex = index + offset;
    const moved = this.reorder(index, targetIndex, true);

    if (moved) {
      this.reorderFeedback.announce(`Retour-Kategorie ${moved.name}`, targetIndex, (this.foodReturnCategories()).length);
    }
  }

  /**
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromIndex: number, toIndex: number, keepFocusOnHandle: boolean): FoodReturnCategory | undefined {
    const reordered = [...(this.foodReturnCategories())];
    if (toIndex < 0 || toIndex >= reordered.length) {
      return undefined;
    }

    moveItemInArray(reordered, fromIndex, toIndex);
    this._foodReturnCategories.set(reordered); // optimistic, updates in the background
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragFoodReturnCategoryHandle-${toIndex}`);
    }

    this.foodReturnCategoriesApiService.reorderFoodReturnCategories(reordered.map(category => category.id)).subscribe({
      next: data => {
        this._foodReturnCategories.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragFoodReturnCategoryHandle-${toIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadFoodReturnCategories();
      }
    });

    return reordered[toIndex];
  }

  protected addFoodReturnCategory() {
    const dialogRef = this.dialog.open(FoodReturnCategoryCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: FoodReturnCategory | undefined) => {
      if (created) {
        this.foodReturnCategoriesApiService.createFoodReturnCategory(created).subscribe({
          next: () => {
            this.toastr.success('Retour-Kategorie erstellt', 'Erfolgreich');
            this.loadFoodReturnCategories();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
}
