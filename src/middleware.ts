import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const { pathname } = url;

  if (pathname === "/" || pathname.endsWith("/")) {
    return next();
  }

  if (pathname.startsWith("/_astro") || pathname.startsWith("/api")) {
    return next();
  }

  if (pathname.includes(".")) {
    return next();
  }

  url.pathname = `${pathname}/`;
  return context.redirect(url.toString(), 308);
});
