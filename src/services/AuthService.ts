import bcrypt from "bcrypt";
import { User, UserModel, UserRole } from "../models/User";

export class AuthService {
  constructor(private userModel: UserModel) {}

  async register(
    username: string,
    password: string,
    role: UserRole = "viewer",
  ): Promise<void> {
    const existingUser = await this.userModel.findByUsername(username);

    if (existingUser) {
      throw new Error("Username already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.userModel.createUser({
      username,
      password: hashedPassword,
      role,
      createdAt: new Date(),
    });
  }

  async validateLogin(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string; role: UserRole } | null> {
    const user = await this.userModel.findByUsername(username);

    if (!user || !user._id) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return null;
    }

    return {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    };
  }
  async getAllUsers(): Promise<Omit<User, "password">[]> {
    const users = await this.userModel.findAllUsers();

    return users.map(({ password, ...user }) => user);
  }

  async changeUserRole(userId: string, role: UserRole): Promise<boolean> {
    return await this.userModel.updateUserRole(userId, role);
  }

  async removeUser(userId: string, requesterId: string): Promise<boolean> {
    if (userId === requesterId) {
      throw new Error("You cannot delete your own account.");
    }

    return await this.userModel.deleteUser(userId);
  }
}
