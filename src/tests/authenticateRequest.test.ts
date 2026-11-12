import { describe, it, expect, beforeEach, vi } from "vitest";
import { authenticateRequest } from "../middleware/authenticateRequest";
import { Request, Response, NextFunction } from "express";

describe("authenticateRequest - API key", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();

    process.env.VC_API_KEY = "test-vc-key";
    process.env.MCP_API_KEY = "test-mcp-key";

    req = {
      headers: {},
    };

    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  it("should authenticate a valid Visual Components API key", () => {
    req.headers = {
      "x-api-key": "test-vc-key",
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();

    expect(res.locals?.user).toMatchObject({
      userId: "vc-client",
      username: "visual-components-client",
      authMethod: "api-key",
      permissions: ["machine-data:write"],
    });
  });

  it("should authenticate a valid MCP API key as the AI client", () => {
    req.headers = {
      "x-api-key": "test-mcp-key",
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();

    expect(res.locals?.user).toMatchObject({
      userId: "mcp-client",
      username: "mcp-ai-client",
      clientType: "ai-client",
      authMethod: "api-key",
      permissions: ["mcp:access"],
    });
  });

  it("should reject an invalid API key", () => {
    req.headers = {
      "x-api-key": "wrong-key",
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject a request without credentials", () => {
    authenticateRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
