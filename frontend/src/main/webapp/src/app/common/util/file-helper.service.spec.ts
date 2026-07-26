import { TestBed } from '@angular/core/testing';
import { FileHelperService } from './file-helper.service';

describe('FileHelperService', () => {

  let service: FileHelperService;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileHelperService]
    });
    service = TestBed.inject(FileHelperService);

    // jsdom doesn't implement these, so they need to be stubbed for every test
    createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as any).createObjectURL;
    delete (URL as any).revokeObjectURL;
  });

  it('downloadFile creates an object URL for the given data, wires it up on a link, and triggers a click', () => {
    const data = new Blob(['file content'], {type: 'text/plain'});

    service.downloadFile('report.pdf', data);

    expect(createObjectURL).toHaveBeenCalledWith(data);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('downloadFile sets the anchor href and download filename before clicking', () => {
    click.mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:mock-url');
      expect(this.download).toBe('report.pdf');
    });

    service.downloadFile('report.pdf', new Blob(['file content']));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('downloadFile revokes the object URL only after the click was triggered', () => {
    const callOrder: string[] = [];
    createObjectURL.mockImplementation(() => {
      callOrder.push('createObjectURL');
      return 'blob:mock-url';
    });
    click.mockImplementation(() => {
      callOrder.push('click');
    });
    revokeObjectURL.mockImplementation(() => {
      callOrder.push('revokeObjectURL');
    });

    service.downloadFile('report.pdf', new Blob(['file content']));

    expect(callOrder).toEqual(['createObjectURL', 'click', 'revokeObjectURL']);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('downloadFile creates an independent object URL for each call', () => {
    createObjectURL.mockReturnValueOnce('blob:mock-url-1').mockReturnValueOnce('blob:mock-url-2');

    service.downloadFile('first.pdf', new Blob(['first']));
    service.downloadFile('second.pdf', new Blob(['second']));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:mock-url-1');
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:mock-url-2');
  });

});
