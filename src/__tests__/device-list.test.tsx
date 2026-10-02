import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DeviceList from '../renderer/components/DeviceList';
import { createElectronMock, deviceFixtures, type ElectronMock } from '../test-utils/renderer.fixtures';

describe('DeviceList', () => {
  it('renders an initial snapshot with online and unavailable devices', () => {
    render(
      <DeviceList
        devices={[deviceFixtures.device, deviceFixtures.offline, deviceFixtures.unauthorized]}
        packageName="com.example.app"
        packageInfo={{}}
        packageLoading={{}}
        busy={{}}
        messages={{}}
        apkSelected
        onInstall={jest.fn()}
        onUninstall={jest.fn()}
      />,
    );

    expect(screen.getByText('Pixel 7')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Требуется разрешение')).toBeInTheDocument();
  });

  it('renders the empty state', () => {
    render(
      <DeviceList
        devices={[]}
        packageName={null}
        packageInfo={{}}
        packageLoading={{}}
        busy={{}}
        messages={{}}
        apkSelected={false}
        onInstall={jest.fn()}
        onUninstall={jest.fn()}
      />,
    );
    expect(screen.getByText('Connect an Android device')).toBeInTheDocument();
  });

  it('preserves callbacks for one device action', () => {
    const onInstall = jest.fn();
    render(
      <DeviceList
        devices={[deviceFixtures.device]}
        packageName="com.example.app"
        packageInfo={{}}
        packageLoading={{}}
        busy={{}}
        messages={{}}
        apkSelected
        onInstall={onInstall}
        onUninstall={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Установить' }));
    expect(onInstall).toHaveBeenCalledWith('emulator-5554');
  });
});
