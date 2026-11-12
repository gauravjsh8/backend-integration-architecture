import { Machine } from "../interfaces/Machine";
import { MachineEvent } from "../interfaces/MachineEvent";
import { ManufacturingDataSource } from "../interfaces/ManufacturingDataSource";
import { EventRepository } from "../interfaces/EventRepository";
export class ManufacturingService {
  constructor(
    private dataSource: ManufacturingDataSource,
    private eventRepository: EventRepository,
  ) {}

  async getMachines(): Promise<Machine[]> {
    return await this.dataSource.getMachines();
  }

  async getMachineStatus(machineId: string): Promise<Machine | null> {
    return await this.dataSource.getMachineStatus(machineId);
  }

  async getMachineEvents(limit?: number): Promise<MachineEvent[]> {
    return await this.eventRepository.getAll(limit);
  }

  async getMachineEventsByMachine(
    machineId: string,
    limit?: number,
  ): Promise<MachineEvent[]> {
    return await this.eventRepository.getByMachine(machineId, limit);
  }

  async getMachineProperty(
    machineId: string,
    property: string,
  ): Promise<MachineEvent | null> {
    return await this.eventRepository.findLatestProperty(machineId, property);
  }

  async getProductionStatus() {
    const machines = await this.getMachines();

    const machineStatuses = machines.map((machine) => ({
      machineId: machine.id,
      state: String(machine.state ?? "Unknown"),
    }));

    const stateCounts: Record<string, number> = {};
    for (const machine of machineStatuses) {
      stateCounts[machine.state] = (stateCounts[machine.state] ?? 0) + 1;
    }

    return {
      totalMachines: machines.length,
      stateCounts,
      machines: machineStatuses,
    };
  }

  async addMachineEvents(events: MachineEvent[]): Promise<void> {
    await this.eventRepository.saveMany(events);
  }
}
