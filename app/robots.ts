import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Share pages expire after 48h and the dashboard requires auth;
        // indexing either produces dead results.
        disallow: ["/api/", "/dashboard", "/share/"],
      },
    ],
    sitemap: "https://music.lab86.io/sitemap.xml",
  };
}
