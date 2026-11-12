import { Machine } from "./Machine";

export interface ManufacturingDataSource {
  getMachines(): Promise<Machine[]>;

  getMachineStatus(machineId: string): Promise<Machine | null>;
}
