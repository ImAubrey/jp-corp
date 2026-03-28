import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";

const defaultLocale = "en";
const locales = {
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

// https://astro.build/config
export default defineConfig({
  site: "https://Astrix.web3templates.com",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  integrations: [
    mdx(),
    sitemap({
      i18n: {
        locales,
        defaultLocale,
      },
      filter: (page) => !new URL(page).pathname.startsWith(`/${defaultLocale}/`),
    }),
    icon(),
  ],
});
