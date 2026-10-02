import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DeviceCard from '../renderer/components/DeviceCard';
import { deviceFixtures } from '../test-utils/renderer.fixtures';

describe('DeviceCard', () => {
  it.each([
    ['device', 'Готово', true],
    ['offline', 'Offline', false],
    ['unauthorized', 'Требуется разрешение', false],
    ['unknown', 'Не установлено', false],
  ] as const)('renders %s state and correct action availability', (status, stateText, canOperate) => {
    const onInstall = jest.fn();
    const onUninstall = jest.fn();
    render(
      <DeviceCard
        device={deviceFixtures[status]}
        packageName="com.example.app"
        packageInfo={null}
        packageLoading={false}
        busy={false}
        apkSelected={canOperate}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />,
    );

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText(stateText)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Установить' })).toHaveProperty('disabled', !canOperate);
    expect(screen.getByRole('button', { name: 'Удалить' })).toHaveProperty('disabled', true);
  });

  it('forwards install and uninstall actions for an online device', () => {
    const onInstall = jest.fn();
    const onUninstall = jest.fn();
    render(
      <DeviceCard
        device={deviceFixtures.device}
        packageName="com.example.app"
        packageInfo={{ packageName: 'com.example.app', versionName: '1.0.0', versionCode: 1 }}
        packageLoading={false}
        busy={false}
        apkSelected
        onInstall={() => onInstall(deviceFixtures.device)}
        onUninstall={() => onUninstall(deviceFixtures.device)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Установить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onInstall).toHaveBeenCalledWith(deviceFixtures.device);
    expect(onUninstall).toHaveBeenCalledWith(deviceFixtures.device);
  });
});
