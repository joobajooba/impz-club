import { next } from "@vercel/functions";
import { hasMmlAccess } from "./src/lib/mmlAccess.js";

export const config = {
  matcher: ["/api/metadata/:path*", "/avatars/green.mml"],
};

export default async function middleware(request) {
  const allowed = await hasMmlAccess(request.headers.get("cookie"));
  if (!allowed) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }
  return next();
}
