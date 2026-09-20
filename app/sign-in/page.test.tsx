import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage, { getPostAuthDestination } from './page';

const { signInMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
}));

vi.mock('@/app/aws-client', () => ({
  cognitoToken: vi.fn().mockResolvedValue(null),
  confirmResetPassword: vi.fn(),
  confirmSignUp: vi.fn(),
  resetPassword: vi.fn(),
  signIn: signInMock,
  signUp: vi.fn(),
}));

describe('SignInPage', () => {
  beforeEach(() => {
    signInMock.mockReset();
    signInMock.mockResolvedValue({});
    window.history.pushState({}, '', '/sign-in');
  });

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

  it('routes buyers to the marketplace by default while keeping explicit seller journeys working', () => {
    expect(getPostAuthDestination()).toBe('/marketplace');
    expect(getPostAuthDestination('/seller')).toBe('/seller');
    expect(getPostAuthDestination('/account')).toBe('/account');
  });
});
