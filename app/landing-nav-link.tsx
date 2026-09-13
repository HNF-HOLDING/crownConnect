'use client';

import type { ReactNode } from 'react';

type LandingNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function LandingNavLink({ href, className, children }: LandingNavLinkProps) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}
