// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://utlium.com',
  integrations: [
    mdx(),
    sitemap({
      // Exclude legacy redirect pages like `/posts/<slug>/` from the sitemap.
      filter: (page) => !page.includes('/posts/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
