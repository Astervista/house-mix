import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DeviceMonitorDeviceComponent} from './device-monitor-device.component';

describe('DeviceMonitorDeviceComponent', () => {
    let component: DeviceMonitorDeviceComponent;
    let fixture: ComponentFixture<DeviceMonitorDeviceComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                                                 imports: [DeviceMonitorDeviceComponent]
                                             })
                     .compileComponents();

        fixture   = TestBed.createComponent(DeviceMonitorDeviceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
