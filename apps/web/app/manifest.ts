import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "BrewLite", short_name: "BrewLite", start_url: "/", scope: "/", display: "standalone", lang: "vi", background_color: "#ffffff", theme_color: "#000000", icons: [{ src: "/brewlite-icon.svg", sizes: "any", type: "image/svg+xml" }] };
}