import { TestBed } from '@angular/core/testing';

import { Deck } from './deck';

describe('Deck', () => {
  let service: Deck;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Deck);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
