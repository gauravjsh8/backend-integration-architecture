import { Request, Response, NextFunction } from "express";
import { Db } from "mongodb";

export interface AuditEntry {
  timestamp: Date;
  method: string;
  path: string;
  status: number;
  client: string;
  authMethod: string;
  role?: string;
  clientType?: string;
  mcpMethod?: string;
  tool?: string;
  toolArguments?: unknown;
}

function getMcpDetails(
  body: unknown,
): Pick<AuditEntry, "mcpMethod" | "tool" | "toolArguments"> {
  const message: unknown = Array.isArray(body) ? body[0] : body;

  if (!message || typeof message !== "object") {
    return {};
  }

  const { method, params } = message as {
    method?: unknown;
    params?: { name?: unknown; arguments?: unknown };
  };

  return {
    mcpMethod: typeof method === "string" ? method : undefined,
    tool: typeof params?.name === "string" ? params.name : undefined,
    toolArguments: params?.arguments,
  };
}

export function createAuditLogger(database: Db) {
  const collection = database.collection<AuditEntry>("audit_logs");

  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      const path = req.originalUrl.split("?")[0];
      const isMcp = path.startsWith("/mcp");
      const isRejected = res.statusCode === 401 || res.statusCode === 403;

      if (!isMcp && !isRejected) {
        return;
      }

      const user = res.locals.user;

      const entry: AuditEntry = {
        timestamp: new Date(),
        method: req.method,
        path,
        status: res.statusCode,
        client: user?.username ?? "anonymous",
        authMethod: user?.authMethod ?? "none",
        role: user?.role,
        clientType: user?.clientType,
        ...(isMcp ? getMcpDetails(req.body) : {}),
      };

      console.log(
        `[AUDIT] ${entry.status} ${entry.method} ${entry.path} client=${entry.client}` +
          (entry.tool ? ` tool=${entry.tool}` : ""),
      );

      collection
        .insertOne(entry)
        .catch((error) => console.error("Failed to write audit log:", error));
    });

    next();
  };
}
