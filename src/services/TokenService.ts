import jwt, { type SignOptions } from "jsonwebtoken";
import { UserRole } from "../models/User";

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: SignOptions["expiresIn"] = (process.env
    .JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];
  constructor() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    this.secret = secret;
  }

  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}
