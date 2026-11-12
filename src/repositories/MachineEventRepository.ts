import { Collection, Db } from "mongodb";
import { MachineEvent } from "../interfaces/MachineEvent";
import { EventRepository } from "../interfaces/EventRepository";

export class MachineEventRepository implements EventRepository {
  private collection: Collection<MachineEvent>;

  constructor(database: Db) {
    this.collection = database.collection<MachineEvent>("machine_events");
  }

  async saveMany(events: MachineEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.collection.insertMany(events);
  }

  async getAll(limit?: number): Promise<MachineEvent[]> {
    const cursor = this.collection.find({}).sort({ timestamp: -1 });
    if (limit) {
      cursor.limit(limit);
    }
    return cursor.toArray();
  }

  async getByMachine(
    machineId: string,
    limit?: number,
  ): Promise<MachineEvent[]> {
    const cursor = this.collection.find({ machineId }).sort({ timestamp: -1 });
    if (limit) {
      cursor.limit(limit);
    }
    return cursor.toArray();
  }

  async findLatestProperty(
    machineId: string,
    property: string,
  ): Promise<MachineEvent | null> {
    return this.collection.findOne(
      { machineId, property },
      {
        sort: { timestamp: -1 },
        collation: { locale: "en", strength: 2 },
      },
    );
  }
}
