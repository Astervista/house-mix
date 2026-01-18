import { TestBed } from '@angular/core/testing';

import { MixingService } from './mixing.service';

describe('MixingService', () => {
  let service: MixingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MixingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
