import { createServer, request as proxyRequest } from "node:http";
import { request as httpsProxyRequest } from "node:https";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.FRONTEND_PORT || 5173);
const target = new URL(process.env.API_TARGET || "http://127.0.0.1:3000");
if (!["http:", "https:"].includes(target.protocol)) {
  throw new Error("API_TARGET must use the http or https protocol.");
}
const forwardRequest = target.protocol === "https:" ? httpsProxyRequest : proxyRequest;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendError(response, status, message) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ success: false, status, message }));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    const upstream = forwardRequest(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        protocol: target.protocol,
        method: request.method,
        path: `${url.pathname}${url.search}`,
        headers: {
          ...request.headers,
          host: target.host,
          "x-forwarded-host": request.headers.host || "",
          "x-forwarded-proto": "http",
        },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );

    upstream.on("error", (error) => {
      console.error(`API proxy error (${target.origin}): ${error.message}`);
      sendError(
        response,
        502,
        `API server at ${target.origin} is unavailable. Start the backend or set API_TARGET.`,
      );
    });

    request.pipe(upstream);
    return;
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(url.pathname);
  } catch {
    sendError(response, 400, "Invalid URL path.");
    return;
  }

  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    sendError(response, 403, "Access denied.");
    return;
  }

  const resolvedPath = existsSync(filePath) && statSync(filePath).isFile()
    ? filePath
    : requestedPath.includes(".")
      ? null
      : resolve(root, "index.html");

  if (!resolvedPath || !existsSync(resolvedPath)) {
    sendError(response, 404, "Frontend resource not found.");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": mimeTypes[extname(resolvedPath)] || "application/octet-stream",
    "x-content-type-options": "nosniff",
  });
  createReadStream(resolvedPath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`StreamTweet frontend: http://localhost:${port}`);
  console.log(`API proxy target: ${target.origin}`);
});
