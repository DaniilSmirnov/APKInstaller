import { Menu } from 'electron';

export const createApplicationMenu = (): void => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [{ role: 'quit' }],
      },
      {
        label: 'View',
        submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }],
      },
    ]),
  );
};
