import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatumDefineDialogComponent } from './datum-define-dialog.component';

describe('OutputDefineDialogComponent', () => {
  let component: DatumDefineDialogComponent;
  let fixture: ComponentFixture<DatumDefineDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatumDefineDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatumDefineDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
