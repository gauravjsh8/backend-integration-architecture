import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { TokenService } from "../services/TokenService";

interface ApiClient {
  key: string | undefined;
  userId: string;
  username: string;
  clientType: "industrial-source" | "ai-client";
  permissions: string[];
}

function getApiClients(): ApiClient[] {
  return [
    {
      key: process.env.VC_API_KEY ?? process.env.API_KEY,
      userId: "vc-client",
      username: "visual-components-client",
      clientType: "industrial-source",
      permissions: ["machine-data:write"],
    },
    {
      key: process.env.MCP_API_KEY,
      userId: "mcp-client",
      username: "mcp-ai-client",
      clientType: "ai-client",
      permissions: ["mcp:access"],
    },
  ];
}

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"];

  if (authHeader !== undefined) {
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Invalid authorization header." });
      return;
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      res.status(401).json({ message: "JWT token is missing." });
      return;
    }

    try {
      const tokenService = new TokenService();
      const user = tokenService.verifyToken(token);

      res.locals.user = { ...user, authMethod: "jwt" };
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired JWT token." });
    }
    return;
  }

  if (apiKey !== undefined) {
    const clients = getApiClients();

    if (!clients.some((client) => client.key)) {
      res.status(500).json({ message: "API keys are not configured." });
      return;
    }

    if (typeof apiKey !== "string") {
      res.status(401).json({ message: "Invalid API key." });
      return;
    }

    const client = clients.find(
      (item) => item.key && keysMatch(apiKey, item.key),
    );

    if (!client) {
      res.status(401).json({ message: "Invalid API key." });
      return;
    }

    res.locals.user = {
      userId: client.userId,
      username: client.username,
      clientType: client.clientType,
      authMethod: "api-key",
      permissions: client.permissions,
    };

    next();
    return;
  }

  res.status(401).json({
    message: "Authentication required. Provide an API key or JWT.",
  });
}
