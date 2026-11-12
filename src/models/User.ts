import { Db, Collection, ObjectId } from "mongodb";

export type UserRole = "viewer" | "operator" | "admin";

export interface User {
  _id?: ObjectId;
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

export class UserModel {
  private collection: Collection<User>;

  constructor(database: Db) {
    this.collection = database.collection<User>("users");
  }

  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ username: 1 }, { unique: true });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.collection.findOne({ username });
  }

  async createUser(user: User): Promise<void> {
    await this.collection.insertOne(user);
  }
  async findAllUsers(): Promise<User[]> {
    return this.collection
      .find({})
      .project<User>({
        password: 0,
      })
      .toArray();
  }

  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    if (!ObjectId.isValid(userId)) {
      return false;
    }

    const result = await this.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role } },
    );

    return result.modifiedCount > 0;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!ObjectId.isValid(userId)) {
      return false;
    }

    const result = await this.collection.deleteOne({
      _id: new ObjectId(userId),
    });

    return result.deletedCount > 0;
  }
}
