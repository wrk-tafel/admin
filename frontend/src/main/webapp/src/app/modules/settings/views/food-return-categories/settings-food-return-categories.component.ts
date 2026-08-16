import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
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
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit.svg';
import package2Icon from '@material-symbols/svg-400/outlined/package_2.svg';
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
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TafelReorderHandleComponent,
    MatTooltipModule,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent,
    RouterLink
  ]
})
export class SettingsFoodReturnCategoriesComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    check: checkIcon,
    close: closeIcon,
    edit: editIcon,
    package_2: package2Icon
  });

  private readonly foodReturnCategoriesApiService = inject(FoodReturnCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private _foodReturnCategories = signal<FoodReturnCategory[]>([]);
  protected foodReturnCategories = this._foodReturnCategories;
  displayedColumns = ['drag', 'active', 'name', 'actions'];

  protected readonly loaded = signal(false);
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');
  /**
   * A deactivated category is never deleted, so the list only ever grows - the filter is what keeps
   * the working list to the categories the Warenerfassung actually offers.
   */
  protected readonly visibleFoodReturnCategories = computed(() =>
    this._foodReturnCategories().filter(category => matchesEnabledFilter(category.enabled, this.enabledFilter()))
  );
  protected readonly enabledCount = computed(() => this._foodReturnCategories().filter(category => category.enabled).length);
  protected readonly totalCount = computed(() => this._foodReturnCategories().length);

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
      next: data => {
        this._foodReturnCategories.set(data);
        this.loaded.set(true);
      },
      error: () => {
        this.loaded.set(true);
        this.toastr.error('Fehler beim Laden der Retour-Kategorien', 'Fehler');
      }
    });
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
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
      this.reorderFeedback.announce(`Retour-Kategorie ${moved.name}`, targetIndex, this.visibleFoodReturnCategories().length);
    }
  }

  /**
   * Both indices count the *displayed* categories, which under an active filter are only some of
   * them - they are translated into the full list before the move, so a category filtered out of
   * view keeps its place instead of being reordered by a move it isn't part of. Moving past such a
   * category therefore jumps over it, which is exactly what the visible list shows afterwards.
   *
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromVisibleIndex: number, toVisibleIndex: number, keepFocusOnHandle: boolean): FoodReturnCategory | undefined {
    const visible = this.visibleFoodReturnCategories();
    if (toVisibleIndex < 0 || toVisibleIndex >= visible.length) {
      return undefined;
    }

    const reordered = [...(this.foodReturnCategories())];
    const fromIndex = reordered.findIndex(category => category.id === visible[fromVisibleIndex].id);
    const toIndex = reordered.findIndex(category => category.id === visible[toVisibleIndex].id);

    moveItemInArray(reordered, fromIndex, toIndex);
    this._foodReturnCategories.set(reordered); // optimistic, updates in the background
    // The handles are keyed by the position in the displayed list, not in the full one.
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragFoodReturnCategoryHandle-${toVisibleIndex}`);
    }

    this.foodReturnCategoriesApiService.reorderFoodReturnCategories(reordered.map(category => category.id)).subscribe({
      next: data => {
        this._foodReturnCategories.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragFoodReturnCategoryHandle-${toVisibleIndex}`);
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

}
