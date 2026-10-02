import React from 'react';

const App = (): JSX.Element => (
  <main className="app-shell">
    <header className="app-header">
      <div>
        <p className="eyebrow">ANDROID TOOLING</p>
        <h1>APKInstaller</h1>
      </div>
      <span className="status-chip">Electron foundation</span>
    </header>
    <section className="empty-state" aria-label="ADB devices">
      <h2>Connect an Android device</h2>
      <p>Device discovery and APK operations will be added in the next migration step.</p>
    </section>
  </main>
);

export default App;
