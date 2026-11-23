type PropertyValue = boolean | number | string | null;

export interface MachineDataRequest {
  timeStamp?: string;
  resources: Array<{
    id: string;
    type: string;
    [key: string]: PropertyValue;
  }>;
}
