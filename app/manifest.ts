import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevBoard — Developer Productivity Dashboard",
    short_name: "DevBoard",
    description:
      "A developer productivity dashboard for managing projects, tasks, and GitHub activity in one place.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#12141a",
    theme_color: "#12141a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}