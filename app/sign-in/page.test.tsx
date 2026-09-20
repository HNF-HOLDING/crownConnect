import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignInPage from './page';

describe('SignInPage', () => {
  it('uses non-submit toggle buttons so mode changes do not trigger form submission', () => {
    render(<SignInPage />);

    const createAccountButton = screen.getByRole('button', {
      name: /new to crownconnect\? create account/i,
    });

    expect(createAccountButton).toHaveAttribute('type', 'button');

    fireEvent.click(createAccountButton);

    expect(
      screen.getByRole('heading', { name: /join crownconnect/i }),
    ).toBeInTheDocument();
  });
});
