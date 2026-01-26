import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import { i18n, filterSitemapByDefaultLocale } from "astro-i18n-aut/integration";

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
    i18n({
      locales,
      defaultLocale,
    }),
    sitemap({
      i18n: {
        locales,
        defaultLocale,
      },
      filter: filterSitemapByDefaultLocale({ defaultLocale }),
    }), 
    icon()
  ],
});
