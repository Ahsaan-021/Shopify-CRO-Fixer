import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { connect as netConnect, type Socket } from "node:net";
import {
  checkTarget,
  type HostResolver,
  type TargetDecision,
} from "@/lib/audit/render/network-guard";

export type SecureProxyOptions = {
  resolver?: HostResolver;
  maxConnections?: number;
  maxBytes?: number;
  idleTimeoutMs?: number;
};

export type SecureProxy = {
  url: string;
  close: () => Promise<void>;
  stats: () => { connections: number; bytes: number; blocked: number };
};

const DEFAULT_MAX_CONNECTIONS = 24;
const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;
const DEFAULT_IDLE_TIMEOUT_MS = 20_000;

function authorityFromConnect(url: string) {
  try {
    const parsed = new URL(`https://${url}`);
    return parsed;
  } catch {
    return null;
  }
}

function safeEnd(response: ServerResponse | Socket, status = 403) {
  if ("writeHead" in response) {
    if (!response.headersSent) {
      response.writeHead(status, { "Content-Type": "text/plain" });
    }
    response.end("Blocked");
    return;
  }

  response.end(`HTTP/1.1 ${status} Blocked\r\nConnection: close\r\n\r\n`);
}

/**
 * A local allow-listing proxy. Chromium is launched with
 * `--proxy-server=http://127.0.0.1:<port>` so every document, redirect,
 * subresource, and iframe request leaves through this code. The proxy resolves
 * the hostname itself, rejects private answers, and then connects to the exact
 * validated IP. That prevents DNS rebinding between the check and the socket.
 *
 * Only GET, HEAD, and OPTIONS are forwarded so a scanned page cannot submit a
 * form or mutate a cart through the browser.
 */
export async function startSecureProxy(
  options: SecureProxyOptions = {},
): Promise<SecureProxy> {
  const maxConnections = options.maxConnections ?? DEFAULT_MAX_CONNECTIONS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const cache = new Map<string, string[]>();
  const sockets = new Set<Socket>();
  let connections = 0;
  let bytes = 0;
  let blocked = 0;
  let closing = false;

  const spend = (amount: number) => {
    bytes += amount;
    if (bytes > maxBytes) {
      for (const socket of sockets) socket.destroy();
      return false;
    }
    return true;
  };

  const countSocket = (socket: Socket) => {
    sockets.add(socket);
    socket.setTimeout(idleTimeoutMs, () => socket.destroy());
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => socket.destroy());
  };

  const decide = async (url: string): Promise<TargetDecision> => {
    const decision = await checkTarget(url, {
      resolver: options.resolver,
      cache,
    });

    if (!decision.ok) blocked += 1;
    return decision;
  };

  const handleHttpRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      request.method !== "OPTIONS"
    ) {
      safeEnd(response, 405);
      return;
    }

    if (
      request.headers.upgrade ||
      String(request.url ?? "").startsWith("/")
    ) {
      safeEnd(response, 403);
      return;
    }

    const decision = await decide(String(request.url ?? ""));
    if (!decision.ok) {
      safeEnd(response, 403);
      return;
    }

    const headers: Record<string, string | string[] | undefined> = {
      ...request.headers,
      host: decision.url.host,
    };
    delete headers["proxy-connection"];

    const upstream = httpRequest(
      {
        host: decision.address,
        family: decision.family,
        port: decision.port,
        path: `${decision.url.pathname}${decision.url.search}`,
        method: request.method,
        headers,
        agent: false,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.on("data", (chunk: Buffer) => {
          if (!spend(chunk.length)) upstreamResponse.destroy();
        });
        upstreamResponse.pipe(response);
      },
    );

    upstream.setTimeout(idleTimeoutMs, () => upstream.destroy());
    upstream.on("error", () => {
      if (!response.headersSent) safeEnd(response, 502);
      else response.destroy();
    });
    request.on("data", (chunk: Buffer) => spend(chunk.length));
    request.pipe(upstream);
  };

  const handleConnect = async (
    request: IncomingMessage,
    clientSocket: Socket,
    head: Buffer,
  ) => {
    if (connections >= maxConnections) {
      safeEnd(clientSocket, 429);
      return;
    }

    connections += 1;
    countSocket(clientSocket);
    clientSocket.pause();

    const authority = authorityFromConnect(String(request.url ?? ""));
    if (!authority) {
      blocked += 1;
      safeEnd(clientSocket, 403);
      return;
    }

    const decision = await decide(authority.origin);
    if (!decision.ok) {
      safeEnd(clientSocket, 403);
      return;
    }

    const upstream = netConnect({
      host: decision.address,
      family: decision.family,
      port: decision.port,
    });

    countSocket(upstream);

    upstream.once("connect", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) {
        if (!spend(head.length)) {
          clientSocket.destroy();
          upstream.destroy();
          return;
        }
        upstream.write(head);
      }

      clientSocket.on("data", (chunk: Buffer) => {
        if (!spend(chunk.length)) {
          clientSocket.destroy();
          upstream.destroy();
        }
      });
      upstream.on("data", (chunk: Buffer) => {
        if (!spend(chunk.length)) {
          upstream.destroy();
          clientSocket.destroy();
        }
      });

      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
      clientSocket.resume();
    });

    upstream.on("error", () => clientSocket.destroy());
  };

  const server = createServer((request, response) => {
    void handleHttpRequest(request, response);
  });

  server.on("connect", (request, socket, head) => {
    if (closing) {
      socket.destroy();
      return;
    }
    void handleConnect(request, socket as Socket, head).catch(() =>
      socket.destroy(),
    );
  });

  server.on("connection", (socket) => countSocket(socket as Socket));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("proxy-listen-failed");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    stats: () => ({ connections, bytes, blocked }),
    close: async () => {
      closing = true;
      for (const socket of sockets) socket.destroy();
      sockets.clear();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
