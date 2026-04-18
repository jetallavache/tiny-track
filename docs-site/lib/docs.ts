export interface DocSection {
  slug: string;
  label: string;
}

export const tinytdNav: DocSection[] = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'install', label: 'Installation' },
  { slug: 'configuration', label: 'Configuration' },
  { slug: 'architecture', label: 'Architecture' },
];

export const tinytracNav: DocSection[] = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'api', label: 'API & Endpoints' },
  { slug: 'configuration', label: 'Configuration' },
  { slug: 'docker', label: 'Docker' },
  { slug: 'troubleshooting', label: 'Troubleshooting' },
];

export const cliNav: DocSection[] = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'commands', label: 'Commands' },
];

export const sdkNav: DocSection[] = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'getting-started', label: 'Getting Started' },
  { slug: 'react', label: 'React' },
  { slug: 'hooks', label: 'Hooks' },
  { slug: 'vanilla', label: 'Vanilla JS / CDN' },
  { slug: 'lite', label: 'tinytsdk-lite' },
];

export function navItems(sections: DocSection[], base: string) {
  return sections.map((s) => ({ label: s.label, href: `/${base}/${s.slug}` }));
}

export function sdkNavItems() {
  return [
    ...navItems(sdkNav, 'sdk'),
    { label: 'Components', href: '/sdk/components' },
  ];
}
