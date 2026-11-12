import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticateRequest } from "../middleware/authenticateRequest";
import { authorizeRole } from "../middleware/authorizeRole";

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);

  router.get(
    "/users",
    authenticateRequest,
    authorizeRole(["admin"]),
    controller.getAllUsers,
  );

  router.patch(
    "/users/:id/role",
    authenticateRequest,
    authorizeRole(["admin"]),
    controller.changeUserRole,
  );

  router.delete(
    "/users/:id",
    authenticateRequest,
    authorizeRole(["admin"]),
    controller.deleteUser,
  );

  return router;
}
