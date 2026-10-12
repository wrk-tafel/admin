import {TestBed} from '@angular/core/testing';
import {PasskeyService} from './passkey.service';

describe('PasskeyService', () => {
  let service: PasskeyService;
  let credentials: {create: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>};

  const credential = {toJSON: () => ({id: 'abc', type: 'public-key'})};

  beforeEach(() => {
    service = TestBed.inject(PasskeyService);
    credentials = {create: vi.fn().mockResolvedValue(credential), get: vi.fn().mockResolvedValue(credential)};
    vi.stubGlobal('navigator', {credentials});
  });

  afterEach(() => vi.unstubAllGlobals());

  function stubBrowserSupport() {
    vi.stubGlobal('PublicKeyCredential', {
      parseCreationOptionsFromJSON: vi.fn((options: unknown) => ({parsedCreation: options})),
      parseRequestOptionsFromJSON: vi.fn((options: unknown) => ({parsedRequest: options}))
    });
  }

  it('reports a browser without WebAuthn, or without its JSON helpers, as unsupported', () => {
    vi.stubGlobal('PublicKeyCredential', undefined);
    expect(service.isSupported()).toBe(false);

    vi.stubGlobal('PublicKeyCredential', {});
    expect(service.isSupported()).toBe(false);

    stubBrowserSupport();
    expect(service.isSupported()).toBe(true);
  });

  it('creates a passkey from the options the browser parsed, and returns it as JSON', async () => {
    stubBrowserSupport();

    const result = await service.create({challenge: 'c'});

    expect(credentials.create).toHaveBeenCalledWith({publicKey: {parsedCreation: {challenge: 'c'}}});
    expect(result).toEqual({id: 'abc', type: 'public-key'});
  });

  it('asks a passkey for an assertion from the options the browser parsed, and returns it as JSON', async () => {
    stubBrowserSupport();

    const result = await service.get({challenge: 'c'});

    expect(credentials.get).toHaveBeenCalledWith({publicKey: {parsedRequest: {challenge: 'c'}}});
    expect(result).toEqual({id: 'abc', type: 'public-key'});
  });

  it('rejects when the browser returns no credential', async () => {
    stubBrowserSupport();
    credentials.get.mockResolvedValue(null);

    await expect(service.get({challenge: 'c'})).rejects.toThrow();
  });
});
