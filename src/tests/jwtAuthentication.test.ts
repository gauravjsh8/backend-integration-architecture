import { describe, it, expect, beforeEach, vi } from "vitest";

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { authenticateRequest } from "../middleware/authenticateRequest";
import { TokenService } from "../services/TokenService";

describe("authenticateRequest - JWT", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const secret = "test-jwt-secret-for-automated-tests";

  beforeEach(() => {
    vi.resetAllMocks();

    process.env.JWT_SECRET = secret;

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

  it("should authenticate a valid JWT", () => {
    const tokenService = new TokenService();

    const token = tokenService.generateToken({
      userId: "user-123",
      username: "testuser",
      role: "viewer",
    });

    req.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();

    expect(res.locals?.user).toMatchObject({
      userId: "user-123",
      username: "testuser",
      role: "viewer",
      authMethod: "jwt",
    });
  });

  it("should reject an invalid JWT", () => {
    req.headers = {
      authorization: "Bearer invalid-token",
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject an expired JWT", () => {
    const expiredToken = jwt.sign(
      {
        userId: "user-123",
        username: "testuser",
        role: "viewer",
      },
      secret,
      { expiresIn: -1 },
    );

    req.headers = {
      authorization: `Bearer ${expiredToken}`,
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject an empty Bearer token", () => {
    req.headers = {
      authorization: "Bearer ",
    };

    authenticateRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
