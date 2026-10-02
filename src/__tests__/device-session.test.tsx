import React, { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useDevices } from '../renderer/hooks/useDevices';
import { createElectronMock, deviceFixtures, type ElectronMock } from '../test-utils/renderer.fixtures';

const Probe = (): JSX.Element => {
  const { devices, loading, error } = useDevices();
  return (
    <output data-testid="session-state">
      {loading ? 'loading' : devices.map((device) => `${device.serial}:${device.status}`).join(',')}
      {error ? ` error:${error.message}` : ''}
    </output>
  );
};

describe('useDevices session contract', () => {
  let electron: ElectronMock;

  beforeEach(() => {
    electron = createElectronMock();
    window.electron = electron as unknown as typeof window.electron;
  });

  it('loads the initial list and subscribes to live changes', async () => {
    electron.devices.list.mockResolvedValue([deviceFixtures.device]);
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('session-state')).toHaveTextContent('emulator-5554:device'));
    expect(electron.devices.list).toHaveBeenCalledTimes(1);
    expect(electron.devices.startTracking).toHaveBeenCalledTimes(1);
    expect(electron.devices.onChange).toHaveBeenCalledTimes(1);
  });

  it('applies add, change and remove events without replacing the list contract', async () => {
    let listener: ((change: { type: 'added' | 'changed' | 'removed'; device: typeof deviceFixtures.device }) => void) | undefined;
    electron.devices.onChange.mockImplementation((nextListener) => {
      listener = nextListener;
      return jest.fn();
    });
    render(<Probe />);
    await waitFor(() => expect(electron.devices.onChange).toHaveBeenCalled());

    act(() => listener?.({ type: 'added', device: deviceFixtures.offline }));
    expect(screen.getByTestId('session-state')).toHaveTextContent('R58M1234:offline');
    act(() => listener?.({ type: 'changed', device: deviceFixtures.device }));
    expect(screen.getByTestId('session-state')).toHaveTextContent('emulator-5554:device');
    act(() => listener?.({ type: 'removed', device: deviceFixtures.offline }));
    expect(screen.getByTestId('session-state')).not.toHaveTextContent('R58M1234:offline');
  });

  it('unsubscribes and stops tracking on unmount', async () => {
    const unsubscribe = jest.fn();
    electron.devices.onChange.mockReturnValue(unsubscribe);
    const { unmount } = render(<Probe />);
    await waitFor(() => expect(electron.devices.startTracking).toHaveBeenCalled());

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(electron.devices.stopTracking).toHaveBeenCalledTimes(1);
  });

  it('surfaces initial list errors', async () => {
    electron.devices.list.mockRejectedValue({ code: 'ADB_UNAVAILABLE', message: 'ADB unavailable' });
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('session-state')).toHaveTextContent('error:ADB unavailable'));
  });
});

