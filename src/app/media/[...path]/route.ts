import { readMedia } from "@/lib/media-store";

/** Uploaded pictures, from MEDIA_DIR (see lib/media.ts). Public: the paths are not secret. */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const file = await readMedia(path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      // A month, in browsers and on Cloudflare. Uploads are named by content hash; ours never change.
      "Cache-Control": "public, max-age=2592000",
      "X-Content-Type-Options": "nosniff",
      // An SVG opened as a page must not run scripts on our origin (inside <img> it never does).
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
