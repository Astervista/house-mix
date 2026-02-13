import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SystemDeviceMonitorDeviceDialogComponent} from './system-device-monitor-device-dialog.component';

describe('SystemTimerDialogComponent', () => {
    let component: SystemDeviceMonitorDeviceDialogComponent;
    let fixture: ComponentFixture<SystemDeviceMonitorDeviceDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                                                 imports: [SystemDeviceMonitorDeviceDialogComponent]
                                             })
                     .compileComponents();

        fixture   = TestBed.createComponent(SystemDeviceMonitorDeviceDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
