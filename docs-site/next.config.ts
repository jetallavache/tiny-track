import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [
      [
        'rehype-highlight',
        {
          detect: true,
          ignoreMissing: true,
        },
      ],
    ],
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  transpilePackages: ['tinytsdk'],
  allowedDevOrigins: ['192.168.0.17'],
};

export default withMDX(nextConfig);
