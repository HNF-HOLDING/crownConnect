import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AccountPage from './page';

vi.mock('../aws-client', () => ({
  awsApi: vi.fn(async () => ({
    ok: true,
    json: async () => ({
      account: {
        email: 'seller@example.com',
        primary_role: 'seller',
        full_name: 'Aisha Seller',
        phone: '0712345678',
        city: 'Johannesburg',
        province: 'Gauteng',
        marketing_consent: false,
        terms_accepted: true,
      },
      identity: { name: 'Aisha Seller' },
    }),
  })),
  cognitoToken: vi.fn(async () => 'test-token'),
  signOut: vi.fn(async () => undefined),
}));

describe('AccountPage', () => {
  it('shows the correct seller callout and CTA when the account is seller-mode', async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText(/you’re ready for seller studio\./i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole('link', { name: /continue to crownconnect pro/i }),
    ).toHaveAttribute('href', '/pro/dashboard');
  });
});
