import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SystemAdjustmentDialogComponent} from './system-adjustment-dialog.component';

describe('SystemAdjustmentDialogComponent', () => {
    let component: SystemAdjustmentDialogComponent;
    let fixture: ComponentFixture<SystemAdjustmentDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                                                 imports: [SystemAdjustmentDialogComponent]
                                             })
                     .compileComponents();

        fixture   = TestBed.createComponent(SystemAdjustmentDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
