import {Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {FoodCategoryCreateDialogComponent} from './dialogs/food-category-create-dialog.component';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
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
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faCheck, faEye, faEyeSlash, faPencil, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';

@Component({
  selector: 'tafel-settings-food-categories',
  templateUrl: 'settings-food-categories.component.html',
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
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ]
})
export class SettingsFoodCategoriesComponent {
  private readonly foodCategoriesApiService = inject(FoodCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _foodCategories = signal<FoodCategory[]>([]);
  protected foodCategories = this._foodCategories;
  displayedColumns = ['active', 'name', 'weightPerUnit', 'returnItem', 'sortOrder', 'actions'];

  protected editingId = signal<number | null>(null);
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  protected weightPerUnitControl = new FormControl<number | null>(null);
  protected returnItemControl = new FormControl<boolean>(false, {nonNullable: true});
  protected sortOrderControl = new FormControl<number>(0, {nonNullable: true});
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    this.loadFoodCategories();

    effect(() => this.nameInput()?.nativeElement.focus());
  }

  private loadFoodCategories() {
    this.foodCategoriesApiService.getAllFoodCategories().subscribe({
      next: data => this._foodCategories.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Lebensmittelkategorien', 'Fehler')
    });
  }

  protected startEdit(category: FoodCategory) {
    this.editingId.set(category.id);
    this.nameControl.setValue(category.name);
    this.weightPerUnitControl.setValue(category.weightPerUnit);
    this.returnItemControl.setValue(category.returnItem);
    this.sortOrderControl.setValue(category.sortOrder);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(category: FoodCategory) {
    const updated: FoodCategory = {
      ...category,
      name: this.nameControl.value,
      weightPerUnit: this.weightPerUnitControl.value,
      returnItem: this.returnItemControl.value,
      sortOrder: this.sortOrderControl.value
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

  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
}
