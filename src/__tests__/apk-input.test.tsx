import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ApkInput from '../renderer/components/ApkDropZone';

describe('ApkInput', () => {
  it('accepts an APK dropped on the drop zone', () => {
    const onChange = jest.fn();
    render(<ApkInput apkPath={null} onSelect={jest.fn()} onDrop={onChange} />);
    const zone = screen.getByRole('button', { name: 'Выбрать APK-файл' });
    const file = { name: 'release.apk', path: '/tmp/release.apk' };

    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onChange).toHaveBeenCalledWith('/tmp/release.apk');
  });

  it('opens the picker and returns a selected APK', () => {
    const onChange = jest.fn();
    render(<ApkInput apkPath={null} onSelect={jest.fn()} onDrop={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = { name: 'debug.apk', path: '/tmp/debug.apk' };

    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith('/tmp/debug.apk');
  });

  it('rejects non-APK files and exposes an accessible error', () => {
    const onChange = jest.fn();
    render(<ApkInput apkPath={null} onSelect={jest.fn()} onDrop={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = { name: 'release.zip', path: '/tmp/release.zip' };

    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Перетащите APK сюда')).toBeInTheDocument();
  });
});
