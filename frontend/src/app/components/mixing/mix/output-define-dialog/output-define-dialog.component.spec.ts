import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutputDefineDialogComponent } from './output-define-dialog.component';

describe('OutputDefineDialogComponent', () => {
  let component: OutputDefineDialogComponent;
  let fixture: ComponentFixture<OutputDefineDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutputDefineDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutputDefineDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
