import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Env } from './types/env.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from './server.js';
import { StatelessHttpTransport } from './transport/statelessHttpTransport.js';
import { getSiteUrl } from './utils/config.js';
import { getMetricsSnapshot } from './services/metrics.js';
import { logger, serializeError } from './utils/logger.js';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version, authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON body.' },
      },
      400,
    );
  }

  const server = createMcpServer(env);
  const transport = new StatelessHttpTransport();
  await server.connect(transport);

  try {
    const messages = Array.isArray(payload)
      ? (payload as JSONRPCMessage[])
      : [payload as JSONRPCMessage];
    const responses = await Promise.all(
      messages.map((message) => transport.handleMessage(message)),
    );
    const results = responses.filter((r): r is JSONRPCMessage => r !== null);

    if (results.length === 0) {
      // All-notifications batch: MCP spec expects 202 Accepted with no body.
      return new Response(null, { status: 202, headers: CORS_HEADERS });
    }
    return jsonResponse(Array.isArray(payload) ? results : results[0]);
  } catch (error) {
    logger.error('mcp.request_failed', { error: serializeError(error) });
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal error handling MCP request.' },
      },
      500,
    );
  } finally {
    await server.close();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', name: SERVER_NAME, version: SERVER_VERSION });
    }

    if (url.pathname === '/version') {
      return jsonResponse({ name: SERVER_NAME, version: SERVER_VERSION, siteUrl: getSiteUrl(env) });
    }

    if (url.pathname === '/metrics') {
      return jsonResponse(getMetricsSnapshot());
    }

    if (url.pathname === '/mcp') {
      if (request.method === 'POST') return handleMcpRequest(request, env);
      return jsonResponse(
        { error: 'This is a stateless MCP endpoint. Send JSON-RPC requests via POST.' },
        405,
      );
    }

    return jsonResponse(
      {
        error: 'Not found',
        hint: 'MCP endpoint is at POST /mcp. See /health, /version, /metrics.',
      },
      404,
    );
  },
};
