import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/User";

export function authorizeRole(
  allowedRoles: UserRole[],
  requiredPermission?: string,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.user;

    if (!user) {
      res.status(401).json({
        message: "Authentication required.",
      });
      return;
    }

    if (user.authMethod === "api-key") {
      if (
        !requiredPermission ||
        !user.permissions?.includes(requiredPermission)
      ) {
        res.status(403).json({
          message: "Forbidden: Application permission denied.",
        });
        return;
      }

      next();
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        message: "Forbidden: You do not have permission.",
      });
      return;
    }

    next();
  };
}
