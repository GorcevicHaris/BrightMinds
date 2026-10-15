import type { MetadataRoute } from "next";

/** Aplikacija sadrži podatke o deci: pretraživači ne treba da indeksiraju ništa osim javnih stranica. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: "*", allow: ["/login", "/register", "/privatnost"], disallow: ["/dashboard", "/api", "/dev"] }],
    };
}
