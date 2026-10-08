import type { MetadataRoute } from "next";

/** Omogućava da se aplikacija doda na početni ekran tableta ili telefona i otvara preko celog ekrana. */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Bright Minds",
        short_name: "Bright Minds",
        description: "Edukativne igre za decu, sa praćenjem napretka za roditelje, učitelje i terapeute.",
        lang: "sr-Latn",
        start_url: "/login",
        display: "standalone",
        background_color: "#f6f5fc",
        theme_color: "#f6f5fc",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
