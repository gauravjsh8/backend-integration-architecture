import { Machine } from "../interfaces/Machine";
import { MachineEvent, EventValue } from "../interfaces/MachineEvent";
import { MachineDataRequest } from "../interfaces/MachineDataRequest";
import { ManufacturingDataSource } from "../interfaces/ManufacturingDataSource";

function isScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export class VisualComponentAdapter implements ManufacturingDataSource {
  private machines: Machine[] = [];

  private previousStates = new Map<string, string>();

  private shouldSaveSnapshot(machine: Machine): boolean {
    const currentState = machine.state;

    if (typeof currentState !== "string" || currentState.trim() === "") {
      return false;
    }

    const previousState = this.previousStates.get(machine.id);

    if (previousState === undefined) {
      this.previousStates.set(machine.id, currentState);
      return true;
    }

    if (previousState !== currentState) {
      console.log(
        `State change: ${machine.id}: ${previousState} -> ${currentState}`,
      );
      this.previousStates.set(machine.id, currentState);
      return true;
    }

    return false;
  }

  private createMachineEvents(machine: Machine, timestamp: Date): MachineEvent {
    const { id, type, ...properties } = machine;
    const values: Record<string, EventValue> = {};
    for (const [property, value] of Object.entries(properties)) {
      if (isScalar(value)) {
        values[property] = value;
      }
    }

    return {
      source: "VisualComponents",
      machineId: id,
      timestamp,
      values,
    };
  }

  updateData(data: MachineDataRequest): MachineEvent[] {
    const timestamp = data.timeStamp ? new Date(data.timeStamp) : new Date();
    const events: MachineEvent[] = [];

    this.machines = data.resources.map((resource) => ({ ...resource }));

    for (const machine of this.machines) {
      if (this.shouldSaveSnapshot(machine)) {
        events.push(this.createMachineEvents(machine, timestamp));
      }
    }

    return events;
  }

  async getMachines(): Promise<Machine[]> {
    return this.machines;
  }

  async getMachineStatus(machineId: string): Promise<Machine | null> {
    return this.machines.find((machine) => machine.id === machineId) ?? null;
  }
}
