import type { MetadataRoute } from "next";

const SITE_URL = "https://zolboo.xyz";

// single-page experience — the whole portfolio lives at the root
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
