import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from '../src/react/theme.js';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'TinyTrack theme preset',
      defaultValue: 'terminal',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['terminal', 'dark', 'light', 'material', 'dracula', 'heroui'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const preset = context.globals.theme ?? 'terminal';
      const bg: Record<string, string> = {
        terminal: '#111827',
        dark: '#1e1e2e',
        light: '#ffffff',
        material: '#1c1b1f',
        dracula: '#282a36',
        heroui: '#0f0f1a',
      };
      return React.createElement(
        ThemeProvider,
        { preset },
        React.createElement(
          'div',
          { style: { background: bg[preset] ?? '#111827', padding: 24, minHeight: '100vh' } },
          React.createElement(Story),
        ),
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true }, // we handle bg via ThemeProvider
  },
};

export default preview;
