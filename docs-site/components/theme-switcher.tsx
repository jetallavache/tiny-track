'use client';
import { useEffect, useState } from 'react';
import { TextMorph } from '@/components/motion-primitives/text-morph';
import { Button } from './ui/button';
import { useTheme, ThemePreset } from 'tinytsdk/react';

export function ThemeSwitcher() {
  const [idx, setIdx] = useState<number>(0);
  const { theme, setPreset, preset } = useTheme();

  const presets: Array<ThemePreset> = ['terminal', 'dark', 'light', 'material', 'dracula', 'heroui', 'shadcnui'];

  const handleSwitch = () => {
    setIdx((prevIdx) => (prevIdx + 1) % presets.length);
    setPreset(presets[(idx + 1) % presets.length]);
  };

  return (
    <Button
      size="lg"
      variant="default"
      onClick={handleSwitch}
      className="rounded-md px-3 py-1.5 text-sm font-mono tracking-tight text-primary-foreground flex h-8 w-[120px]"
      style={{
        color: theme.btnText,
        background: theme.bg,
      }}
    >
      <TextMorph>{presets[idx]}</TextMorph>
    </Button>
  );
}
