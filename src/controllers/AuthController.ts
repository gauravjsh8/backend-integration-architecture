import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { TokenService } from "../services/TokenService";

export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        username.trim().length < 3 ||
        password.length < 8
      ) {
        res.status(400).json({
          message:
            "Username must be at least 3 characters and password at least 8 characters.",
        });
        return;
      }

      await this.authService.register(username.trim(), password, "viewer");

      res.status(201).json({
        message: "User registered successfully.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Username already exists."
      ) {
        res.status(409).json({ message: error.message });
        return;
      }

      console.error("Registration error:", error);
      res.status(500).json({
        message: "Registration failed.",
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !username.trim() ||
        !password
      ) {
        res.status(400).json({
          message: "Username and password are required.",
        });
        return;
      }

      const user = await this.authService.validateLogin(
        username.trim(),
        password,
      );

      if (!user) {
        res.status(401).json({
          message: "Invalid username or password.",
        });
        return;
      }

      const token = this.tokenService.generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      res.json({
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        message: "Login failed.",
      });
    }
  };
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.authService.getAllUsers();
      res.status(200).json({ users });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to retrieve users." });
    }
  };

  changeUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;

      if (typeof id !== "string") {
        res.status(400).json({ message: "Invalid user ID." });
        return;
      }
      const { role } = req.body;

      const validRoles = ["viewer", "operator", "admin"];

      if (typeof role !== "string" || !validRoles.includes(role)) {
        res.status(400).json({
          message: "Invalid role. Use viewer, operator, or admin.",
        });
        return;
      }

      const updated = await this.authService.changeUserRole(
        id,
        role as "viewer" | "operator" | "admin",
      );

      if (!updated) {
        res.status(404).json({ message: "User not found or role unchanged." });
        return;
      }

      res.status(200).json({ message: "User role updated successfully." });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update user role." });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;

      if (typeof id !== "string") {
        res.status(400).json({ message: "Invalid user ID." });
        return;
      }
      const requesterId = res.locals.user?.userId;

      if (!requesterId) {
        res.status(401).json({ message: "Authentication required." });
        return;
      }

      const deleted = await this.authService.removeUser(id, requesterId);

      if (!deleted) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      if (error instanceof Error && error.message.includes("own account")) {
        res.status(403).json({ message: error.message });
        return;
      }

      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user." });
    }
  };
}
