import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { MachineEventRepository } from "../repositories/MachineEventRepository";
import { MachineEvent } from "../interfaces/MachineEvent";

describe("MachineEventRepository", () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let database: Db;
  let repository: MachineEventRepository;

  const earlier = new Date("2026-11-01T10:00:00Z");
  const later = new Date("2026-11-01T11:00:00Z");

  function sampleEvents(): MachineEvent[] {
    return [
      {
        source: "Test",
        machineId: "Washer",
        property: "state",
        value: "Idle",
        timestamp: earlier,
      },
      {
        source: "Test",
        machineId: "Washer",
        property: "state",
        value: "Running",
        timestamp: later,
      },
      {
        source: "Test",
        machineId: "Washer",
        property: "spindle",
        value: 1500,
        timestamp: later,
      },
      {
        source: "Test",
        machineId: "CMM",
        property: "state",
        value: "Busy",
        timestamp: later,
      },
    ];
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoClient = new MongoClient(mongoServer.getUri());
    await mongoClient.connect();
    database = mongoClient.db("repository_test");
    repository = new MachineEventRepository(database);
  });

  beforeEach(async () => {
    await database.collection("machine_events").deleteMany({});
    await repository.saveMany(sampleEvents());
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  it("should return only the events of one machine, newest first", async () => {
    const events = await repository.getByMachine("Washer");

    expect(events).toHaveLength(3);
    expect(events.every((event) => event.machineId === "Washer")).toBe(true);
    expect(events[0].timestamp.getTime()).toBe(later.getTime());
    expect(events[2].timestamp.getTime()).toBe(earlier.getTime());
  });

  it("should respect the limit for one machine", async () => {
    const events = await repository.getByMachine("Washer", 1);

    expect(events).toHaveLength(1);
  });

  it("should respect the limit for all events", async () => {
    const events = await repository.getAll(2);

    expect(events).toHaveLength(2);
  });

  it("should find the latest value of a property without case sensitivity", async () => {
    const event = await repository.findLatestProperty("Washer", "STATE");

    expect(event?.value).toBe("Running");
  });

  it("should return null for a missing property", async () => {
    const event = await repository.findLatestProperty("Washer", "temperature");

    expect(event).toBeNull();
  });
});
