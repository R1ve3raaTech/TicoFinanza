import type { MetadataRoute } from "next";

/**
 * /dashboard y /auth requieren sesión (redirigen a /entrar sin ella) —
 * indexarlos no serviría de nada y le da a Google menos páginas reales que
 * rastrear.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth", "/api"],
    },
    sitemap: "https://www.ticofinanza.com/sitemap.xml",
  };
}
