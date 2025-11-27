import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GanopolyCard } from './ganopoly-card';

describe('GanopolyCard', () => {
  let component: GanopolyCard;
  let fixture: ComponentFixture<GanopolyCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GanopolyCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GanopolyCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
