import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authorizeRole } from "../middleware/authorizeRole";

describe("authorizeRole - RBAC", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();

    req = {};

    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn();
  });

  it("should allow a viewer to access read-only resources", () => {
    res.locals!.user = {
      userId: "viewer-1",
      role: "viewer",
      authMethod: "jwt",
    };

    const middleware = authorizeRole(
      ["viewer", "operator", "admin"],
      "manufacturing:read",
    );

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should reject a viewer from operator-only operations", () => {
    res.locals!.user = {
      userId: "viewer-1",
      role: "viewer",
      authMethod: "jwt",
    };

    const middleware = authorizeRole(
      ["operator", "admin"],
      "machine-data:write",
    );

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow an operator to perform operator-only operations", () => {
    res.locals!.user = {
      userId: "operator-1",
      role: "operator",
      authMethod: "jwt",
    };

    const middleware = authorizeRole(
      ["operator", "admin"],
      "machine-data:write",
    );

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should allow an admin to perform admin-only operations", () => {
    res.locals!.user = {
      userId: "admin-1",
      role: "admin",
      authMethod: "jwt",
    };

    const middleware = authorizeRole(["admin"], "admin:manage");

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should allow an API client with the required permission", () => {
    res.locals!.user = {
      userId: "api-client",
      authMethod: "api-key",
      permissions: ["manufacturing:read"],
    };

    const middleware = authorizeRole(
      ["viewer", "operator", "admin"],
      "manufacturing:read",
    );

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should reject an API client without the required permission", () => {
    res.locals!.user = {
      userId: "api-client",
      authMethod: "api-key",
      permissions: ["machine-data:write"],
    };

    const middleware = authorizeRole(
      ["viewer", "operator", "admin"],
      "manufacturing:read",
    );

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject requests without authentication", () => {
    const middleware = authorizeRole(
      ["viewer", "operator", "admin"],
      "manufacturing:read",
    );

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
