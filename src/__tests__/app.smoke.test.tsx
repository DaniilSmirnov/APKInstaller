import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../renderer/App';

describe('App', () => {
  it('renders the foundation screen', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('APKInstaller');
    expect(html).toContain('Connect an Android device');
  });
});
