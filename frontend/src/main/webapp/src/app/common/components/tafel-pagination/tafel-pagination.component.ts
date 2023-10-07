import {Component, Input} from '@angular/core';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html'
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';
  @Input() paginationData: TafelPaginationData;

  private AMOUNT_PAGES_TO_CURRENTPAGE = 2;

  public getPages(): number[] {
    if (!this.paginationData) {
      const totalPages = this.paginationData.totalPages;

      // const minPage = Math.min(this.currentPage(), this.currentPage() - this.AMOUNT_PAGES_TO_CURRENTPAGE);
    }
    return [];
  }

}

export interface TafelPaginationData {
  currentPage: number;
  totalPages: number;
}
