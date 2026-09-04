import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /feed is the Meta catalog — for Commerce Manager to fetch, not for a
      // search engine to index as a page.
      disallow: ["/admin", "/api", "/account", "/checkout", "/cart", "/feed"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
