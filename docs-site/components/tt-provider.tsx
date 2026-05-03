'use client';

import { TinyTrackProvider, ThemeProvider } from 'tinytsdk/react';
import type { ReactNode } from 'react';

const TT_URL = process.env.NEXT_PUBLIC_TT_URL ?? 'ws://localhost:25015';
const TT_TOKEN = process.env.NEXT_PUBLIC_TT_TOKEN ?? '';

export function TtProvider({ children }: { children: ReactNode }) {
  return (
    <TinyTrackProvider url={TT_URL} token={TT_TOKEN}>
      <ThemeProvider preset="shadcnui">{children}</ThemeProvider>
    </TinyTrackProvider>
  );
}
