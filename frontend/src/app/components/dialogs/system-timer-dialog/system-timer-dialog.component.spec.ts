import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemTimerDialogComponent } from './system-timer-dialog.component';

describe('SystemTimerDialogComponent', () => {
  let component: SystemTimerDialogComponent;
  let fixture: ComponentFixture<SystemTimerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemTimerDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemTimerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
