import { MachineEvent, MachinePropertyValue } from "./MachineEvent";

export interface EventRepository {
  saveMany(events: MachineEvent[]): Promise<void>;
  getAll(limit?: number): Promise<MachineEvent[]>;
  getByMachine(machineId: string, limit?: number): Promise<MachineEvent[]>;
  findLatestProperty(
    machineId: string,
    property: string,
  ): Promise<MachinePropertyValue | null>;
}
