import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig(async () => {
  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    build: { rolldownOptions: { external: ['cloudflare:workers'] } },
    plugins: [vinext(), sites()],
  };
});
