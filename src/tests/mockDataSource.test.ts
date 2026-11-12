import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { createApp } from "../app";
import { TokenService } from "../services/TokenService";

describe("Mock data source (T12: replaceable data source)", () => {
  const MCP_KEY = "mock-test-mcp-key";
  const VC_KEY = "mock-test-vc-key";

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let database: Db;
  let app: ReturnType<typeof createApp>;
  let viewerToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = "mock-test-secret";
    process.env.MCP_API_KEY = MCP_KEY;
    process.env.VC_API_KEY = VC_KEY;
    process.env.DATA_SOURCE = "mock";

    mongoServer = await MongoMemoryServer.create();
    mongoClient = new MongoClient(mongoServer.getUri());
    await mongoClient.connect();
    database = mongoClient.db("mock_test");

    app = createApp(database);

    viewerToken = new TokenService().generateToken({
      userId: "viewer-id",
      username: "viewer1",
      role: "viewer",
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    delete process.env.DATA_SOURCE;
    await mongoClient.close();
    await mongoServer.stop();
  });

  it("should return the mock machines through the REST API", async () => {
    const response = await request(app)
      .get("/api/machines")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "VF-12", state: "Busy" }),
        expect.objectContaining({ id: "Washer", state: "Idle" }),
      ]),
    );
  });

  it("should calculate production status from the mock machines", async () => {
    const response = await request(app)
      .get("/api/production/status")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totalMachines).toBe(2);
    expect(response.body.stateCounts).toEqual({ Busy: 1, Idle: 1 });
  });

  it("should return mock data through the MCP tool get_machine_status", async () => {
    const initialize = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "mock-test-client", version: "1.0.0" },
        },
      });

    expect(initialize.status).toBe(200);

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_status",
          arguments: { machineId: "Washer" },
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Washer");
    expect(response.text).toContain("Idle");
  });

  it("should not accept Visual Components data when the mock source is used", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", VC_KEY)
      .send({ machineId: "VF-12", properties: { state: "Idle" } });

    expect(response.status).not.toBe(200);
  });
});
