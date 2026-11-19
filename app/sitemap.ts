import type { MetadataRoute } from "next";

const BASE_URL = "https://www.ticofinanza.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/entrar`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
