import { Machine } from "../interfaces/Machine";
import { ManufacturingDataSource } from "../interfaces/ManufacturingDataSource";

export class MockManufacturingAdapter implements ManufacturingDataSource {
  private machines: Machine[] = [
    {
      id: "VF-12",
      type: "Machine",
      state: "Busy",
      spindle: 1500,
    },
    {
      id: "Washer",
      type: "Machine",
      state: "Idle",
      door: false,
    },
  ];

  async getMachines(): Promise<Machine[]> {
    return this.machines;
  }

  async getMachineStatus(machineId: string): Promise<Machine | null> {
    return this.machines.find((machine) => machine.id === machineId) ?? null;
  }
}
