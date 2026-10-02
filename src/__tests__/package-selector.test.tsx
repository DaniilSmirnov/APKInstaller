import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PackageSelector from '../renderer/components/PackageSelector';

describe('PackageSelector', () => {
  it('adds, selects and removes package names', () => {
    const onChange = jest.fn();
    render(<PackageSelector value="com.example.app" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/имена пакетов/i), { target: { value: 'ru.vk.android' } });
    expect(onChange).toHaveBeenLastCalledWith('ru.vk.android');
  });

  it('rejects invalid package names', () => {
    const onChange = jest.fn();
    render(<PackageSelector value="not a package" onChange={onChange} />);
    expect(screen.getByDisplayValue('not a package')).toBeInTheDocument();
  });
});
