import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PageItemDirective, PageLinkDirective, PaginationComponent} from '@coreui/angular';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html',
  imports: [
    PaginationComponent,
    PageItemDirective,
    PageLinkDirective
  ]
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';
  @Output() pageChanged = new EventEmitter<number>();

  maxPage: number;
  currentPage: number;
  text: string;

  @Input() set paginationData(paginationData: TafelPaginationData) {
    this.currentPage = paginationData.currentPage;
    this.maxPage = paginationData.totalPages;

    const start = ((paginationData.currentPage - 1) * paginationData.pageSize) + 1;
    const end = (start - 1) + paginationData.count;
    this.text = `${start} - ${end} von ${paginationData.totalCount}`;
  }

  selectFirstPage() {
    this.pageChanged.emit(1);
  }

  selectPreviousPage() {
    this.pageChanged.emit(Math.max(1, this.currentPage - 1));
  }

  selectNextPage() {
    this.pageChanged.emit(Math.min(this.maxPage, this.currentPage + 1));
  }

  selectLastPage() {
    this.pageChanged.emit(this.maxPage);
  }

}

export interface TafelPaginationData {
  count: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}
