export interface MachineDataRequest {
  machineId?: string;
  properties?: {
    [key: string]: boolean | number | string;
  };
  timeStamp?: string;
  resources?: Array<{
    id: string;
    type: string;
    [key: string]: boolean | number | string;
  }>;
}
