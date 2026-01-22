import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MixingComponent } from './mixing.component';

describe('MixingComponent', () => {
  let component: MixingComponent;
  let fixture: ComponentFixture<MixingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MixingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MixingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
