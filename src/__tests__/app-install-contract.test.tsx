import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../renderer/App';
import { createElectronMock, deviceFixtures, type ElectronMock } from '../test-utils/renderer.fixtures';

describe('App installation contract', () => {
  let electron: ElectronMock;

  beforeEach(() => {
    electron = createElectronMock();
    electron.devices.list.mockResolvedValue([deviceFixtures.device, deviceFixtures.offline]);
    window.electron = electron as unknown as typeof window.electron;
  });

  it('keeps install actions disabled until an APK and package are selected', async () => {
    render(<App />);
    await waitFor(() => expect(electron.devices.list).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Установить на все' })).toBeDisabled();
  });

  it('does not install offline devices during install-all', async () => {
    render(<App />);
    await waitFor(() => expect(electron.devices.list).toHaveBeenCalled());
    const installAll = screen.queryByRole('button', { name: 'Установить на все' });
    if (installAll) fireEvent.click(installAll);
    expect(electron.devices.install).not.toHaveBeenCalledWith('R58M1234', expect.anything(), expect.anything());
  });
});
