import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('Home page', () => {
  it('renders the hero content with clear, distinct calls to action', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', {
        name: /everything for your crown, in one place\./i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /book a stylist/i }),
    ).toHaveAttribute('href', '/marketplace');

    expect(
      screen.getByRole('link', { name: /explore hair products/i }),
    ).toHaveAttribute('href', '/products');

    expect(screen.getByText(/from inspiration to appointment\./i)).toBeInTheDocument();
  });
});
