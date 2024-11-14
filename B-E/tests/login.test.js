const { handler } = require("../src/handlers/login");
const bcrypt = require("bcryptjs");
const pool = require("../src/util/index");

// Mock bcrypt module
jest.mock("bcryptjs");

// Mock pool from util/index
jest.mock("../src/util/index", () => ({
  getConnection: jest.fn(),
}));

describe("Login Handler", () => {
  let connectionMock;

  beforeEach(() => {
    // Mock connection with execute and release functions
    connectionMock = {
      execute: jest.fn(),
      release: jest.fn(),
    };

    // Make getConnection return the mocked connection
    pool.getConnection.mockResolvedValue(connectionMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if email or password is missing", async () => {
    const response = await handler({ body: JSON.stringify({}) });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      "Email and password are required"
    );
  });

  it("should return 404 if user is not found", async () => {
    connectionMock.execute.mockResolvedValue([[]]); // Mock empty result
    const response = await handler({
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe("User not found");
  });

  it("should return 401 if password is incorrect", async () => {
    connectionMock.execute.mockResolvedValue([
      [{ email: "test@example.com", password: "hashedPassword" }],
    ]);
    bcrypt.compare.mockResolvedValue(false);
    const response = await handler({
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).message).toBe("Invalid email or password");
  });

  it("should return 200 and userId if login is successful", async () => {
    connectionMock.execute.mockResolvedValue([
      [{ id: 1, email: "test@example.com", password: "hashedPassword" }],
    ]);
    bcrypt.compare.mockResolvedValue(true);
    const response = await handler({
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe("Login successful");
    expect(JSON.parse(response.body).userId).toBe(1);
  });
});
