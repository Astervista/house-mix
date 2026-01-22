import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemParameterDialogComponent } from './system-parameter-dialog.component';

describe('SystemParameterDialogComponent', () => {
  let component: SystemParameterDialogComponent;
  let fixture: ComponentFixture<SystemParameterDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemParameterDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemParameterDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
