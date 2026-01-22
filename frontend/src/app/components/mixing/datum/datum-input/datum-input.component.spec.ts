import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatumInputComponent } from './datum-input.component';

describe('DatumInputComponent', () => {
  let component: DatumInputComponent;
  let fixture: ComponentFixture<DatumInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatumInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatumInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
