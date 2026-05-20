// Electron desktop wrapper for Recaste Boards.
// Builds a thin window that loads the published web app and surfaces
// system pop-up notifications natively (no browser permission prompt).

const { app, BrowserWindow, Notification, shell } = require('electron');
const path = require('path');

const APP_URL = process.env.RECASTE_URL || 'https://recaste-boards.lovable.app';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Recaste',
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);

  // Open external links in the user's default browser instead of new Electron windows
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // On macOS, give the app a friendlier identity for notifications
  if (process.platform === 'darwin') app.setName('Recaste');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Sanity check that native notifications are available on this OS
app.whenReady().then(() => {
  if (!Notification.isSupported()) {
    console.warn('Native notifications are NOT supported on this platform.');
  }
});