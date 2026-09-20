import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AwsMarketplace } from './aws-marketplace';

describe('AwsMarketplace', () => {
  it('shows a helpful empty-state when no stylists are available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sellers: [] }),
      }),
    );

    render(<AwsMarketplace />);

    await waitFor(() => {
      expect(screen.getByText(/no stylists available yet/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /become a seller/i })).toHaveAttribute(
      'href',
      '/sign-in?mode=signup',
    );
  });

  it('shows trusted local-style context and clear city location on seller cards', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sellers: [
            {
              id: 'seller-1',
              business_name: 'Crown Studio',
              city: 'Johannesburg',
              specialty: 'Braids',
              featured_service: 'Luxury box braids',
              service_price: 850,
              bio: 'Trusted braider serving the local community with precision styling.',
            },
          ],
        }),
      }),
    );

    render(<AwsMarketplace />);

    await waitFor(() => {
      expect(screen.getByText(/verified local stylist/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/johannesburg/i)).toBeInTheDocument();
    expect(screen.getByText(/within 8 km/i)).toBeInTheDocument();
  });
});
