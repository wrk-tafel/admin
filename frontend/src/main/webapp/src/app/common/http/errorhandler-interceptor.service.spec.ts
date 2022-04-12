import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ErrorHandlerInterceptor } from './errorhandler-interceptor.service';

describe('ErrorHandlerInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ErrorHandlerInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorHandlerInterceptor,
          multi: true
        }
      ],
    });
  });

  it('todo', () => {
    expect(false).toBe(true);
  });
});
