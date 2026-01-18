import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingScrimComponent } from './loading-scrim.component';

describe('LoadingScrimComponent', () => {
  let component: LoadingScrimComponent;
  let fixture: ComponentFixture<LoadingScrimComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingScrimComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingScrimComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
