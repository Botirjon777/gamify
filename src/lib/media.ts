/**
 * Uploaded pictures (IQ questions). The files live outside the release, in MEDIA_DIR — on the server
 * /srv/zukkolar/shared/media — and are served at /media/<path>. The database stores only the path,
 * e.g. "iq/sandia/s001.png". No server-only imports: the browser builds URLs from the same paths.
 */
export const MEDIA_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" } as const;
export type MediaExt = keyof typeof MEDIA_TYPES;

/** Lowercase folders and one extension: no "..", no leading slash — a path can never leave MEDIA_DIR. */
export const MEDIA_PATH = /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(png|jpg|webp|svg)$/;

export const mediaUrl = (path: string) => `/media/${path}`;
