export const config = { runtime: "edge" };

const ALLOWED = {
  plan: (z, x, y) => {
    const sub = "abc"[x % 3];
    return `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  },
  sat: (z, x, y) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

export default async function handler(req) {
  const url  = new URL(req.url);
  const z    = parseInt(url.searchParams.get("z") ?? "");
  const x    = parseInt(url.searchParams.get("x") ?? "");
  const y    = parseInt(url.searchParams.get("y") ?? "");
  const type = url.searchParams.get("type") === "sat" ? "sat" : "plan";

  if ([z, x, y].some(isNaN) || z < 0 || z > 20 || x < 0 || y < 0) {
    return new Response(null, { status: 400 });
  }

  const tileUrl = ALLOWED[type](z, x, y);

  try {
    const upstream = await fetch(tileUrl, {
      headers: { "User-Agent": "APPLITAG-tile-proxy/1.0 (bois-energie)" },
    });
    if (!upstream.ok) return new Response(null, { status: upstream.status });

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type":                "image/png",
        "Cache-Control":               "public, max-age=86400, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
