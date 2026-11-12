import { McpServer } from "@modelcontextprotocol/server";
import { ManufacturingService } from "../services/ManufacturingService";
import * as z from "zod/v4";

const machineIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9 _-]+$/, "Machine ID contains invalid characters.")
  .describe(
    "The machine identifier, for example Washer, CMM, VF-1 1 or VF-1 2.",
  );

const propertySchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9_]+$/, "Property name contains invalid characters.")
  .describe("The property name, for example spindle, state or processTime.");

const DEFAULT_EVENT_LIMIT = 20;

export function createManufacturingMcpServer(
  manufacturingService: ManufacturingService,
): McpServer {
  const server = new McpServer({
    name: "industrial-backend",
    version: "1.0.0",
  });

  server.registerTool(
    "get_machine_events",
    {
      description:
        "Retrieve recent historical machine events from the database. Read-only.",
      inputSchema: z.object({
        machineId: machineIdSchema.optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of events to return (1-100, default 20)."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId, limit }) => {
      const maxEvents = limit ?? DEFAULT_EVENT_LIMIT;

      const recentEvents = machineId
        ? await manufacturingService.getMachineEventsByMachine(
            machineId,
            maxEvents,
          )
        : await manufacturingService.getMachineEvents(maxEvents);

      return {
        content: [
          { type: "text", text: JSON.stringify(recentEvents, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "get_machine_status",
    {
      description:
        "Retrieve the current information and properties of a specific manufacturing machine. Read-only.",
      inputSchema: z.object({ machineId: machineIdSchema }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId }) => {
      const status = await manufacturingService.getMachineStatus(machineId);

      if (!status) {
        return {
          content: [
            { type: "text", text: `Machine '${machineId}' was not found.` },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_machine_property",
    {
      description:
        "Retrieve the latest stored historical value of a specific property from a manufacturing machine. Read-only.",
      inputSchema: z.object({
        machineId: machineIdSchema,
        property: propertySchema,
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId, property }) => {
      const event = await manufacturingService.getMachineProperty(
        machineId,
        property,
      );

      return {
        content: [
          {
            type: "text",
            text: event
              ? JSON.stringify(event, null, 2)
              : `Property '${property}' was not found for machine '${machineId}'.`,
          },
        ],
      };
    },
  );

  return server;
}
