import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html'
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';

  @Output() pageChanged = new EventEmitter<number>();

  pages: number[];
  currentPage: number;

  @Input() set paginationData(paginationData: TafelPaginationData) {
    const currentPage = paginationData.currentPage;
    this.currentPage = currentPage;
    this.pages = Array.from({length: paginationData.totalPages}, (value, key) => key + 1);
  }

  emitPageChange(pageIndex: number) {
    this.pageChanged.emit(pageIndex);
  }

}

export interface TafelPaginationData {
  currentPage: number;
  totalPages: number;
}
