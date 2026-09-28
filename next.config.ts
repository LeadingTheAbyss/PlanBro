import type { NextConfig } from "next";
import path from "path";

// FastAPI backend origin — same value used by the existing server-side proxy
// routes (src/app/api/{transport,places,food,...}/route.ts).
const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL_ORIGIN || "http://127.0.0.1:8002";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // A stray package-lock.json in the user's home directory (unrelated to
  // this project) makes Next.js misdetect the workspace root as that parent
  // folder instead of here. Pin it explicitly to silence the warning.
  outputFileTracingRoot: path.resolve(__dirname),
  async rewrites() {
    return [
      // Routes migrated off Next.js API routes onto the FastAPI backend
      // (see backend/routers/** in the Python backend). Keeping these as
      // same-origin rewrites (rather than switching the frontend to
      // cross-origin fetches) means the brewplans_session cookie keeps
      // working with zero frontend changes.
      { source: "/api/auth", destination: `${FASTAPI_URL}/api/auth` },
      { source: "/api/auth/:path*", destination: `${FASTAPI_URL}/api/auth/:path*` },
      { source: "/api/trips", destination: `${FASTAPI_URL}/api/trips` },
      { source: "/api/trips/:path*", destination: `${FASTAPI_URL}/api/trips/:path*` },
      { source: "/api/passengers", destination: `${FASTAPI_URL}/api/passengers` },
      { source: "/api/feedback", destination: `${FASTAPI_URL}/api/feedback` },
      { source: "/api/trip-attempt", destination: `${FASTAPI_URL}/api/trip-attempt` },
      { source: "/api/state", destination: `${FASTAPI_URL}/api/state` },
      { source: "/api/blogs", destination: `${FASTAPI_URL}/api/blogs` },
      { source: "/api/blogs/:path*", destination: `${FASTAPI_URL}/api/blogs/:path*` },
      { source: "/api/avatar", destination: `${FASTAPI_URL}/api/avatar` },
      { source: "/api/image", destination: `${FASTAPI_URL}/api/image` },
      { source: "/api/proxy-image", destination: `${FASTAPI_URL}/api/proxy-image` },
      { source: "/api/theme-wiki-image", destination: `${FASTAPI_URL}/api/theme-wiki-image` },
      { source: "/api/destination-photo", destination: `${FASTAPI_URL}/api/destination-photo` },
      { source: "/api/upload", destination: `${FASTAPI_URL}/api/upload` },
      { source: "/api/local-cities", destination: `${FASTAPI_URL}/api/local-cities` },
      { source: "/api/admin/stats", destination: `${FASTAPI_URL}/api/admin/stats` },
      { source: "/api/admin/user/:path*", destination: `${FASTAPI_URL}/api/admin/user/:path*` },
      { source: "/api/admin/smart-fill", destination: `${FASTAPI_URL}/api/admin/smart-fill` },
      // Already-existing FastAPI-native routes that had a thin passthrough
      // Next.js route — now hit FastAPI directly instead of round-tripping.
      { source: "/api/pincode/:path*", destination: `${FASTAPI_URL}/api/pincode/:path*` },
      // Auth+quota gating that used to live in a Next.js proxy in front of
      // these has moved directly into api.py (see check_and_increment_quota
      // in backend/quota.py) — these now hit FastAPI's own route directly.
      { source: "/api/food", destination: `${FASTAPI_URL}/api/food` },
      { source: "/api/hotels", destination: `${FASTAPI_URL}/api/hotels` },
      { source: "/api/places", destination: `${FASTAPI_URL}/api/places` },
      { source: "/api/places/:path*", destination: `${FASTAPI_URL}/api/places/:path*` },
      { source: "/api/transport", destination: `${FASTAPI_URL}/api/transport` },
      { source: "/api/recommendations", destination: `${FASTAPI_URL}/api/recommendations` },
      { source: "/api/route-matrix", destination: `${FASTAPI_URL}/api/route-matrix` },
      { source: "/api/search-city", destination: `${FASTAPI_URL}/api/search-city` },
      { source: "/api/optimize_itinerary", destination: `${FASTAPI_URL}/api/optimize_itinerary` },
      { source: "/api/ola/:path*", destination: `${FASTAPI_URL}/api/ola/:path*` },
    ];
  },
};

export default nextConfig;
