const { handler } = require("../src/handlers/register");
const bcrypt = require("bcryptjs");
const pool = require("../src/util/index");

// Mock bcrypt module
jest.mock("bcryptjs");

// Mock pool from util/index
jest.mock("../src/util/index", () => ({
  getConnection: jest.fn(),
}));

describe("Register Handler", () => {
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

  it("should return 200 if user is registered successfully", async () => {
    bcrypt.hash.mockResolvedValue("hashedPassword");
    connectionMock.execute.mockResolvedValue([{}]); // Mock successful insertion
    const response = await handler({
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      "User registered successfully"
    );
  });

  it("should return 500 if there is an error registering the user", async () => {
    bcrypt.hash.mockResolvedValue("hashedPassword");
    connectionMock.execute.mockRejectedValue(new Error("Database error"));
    const response = await handler({
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Error registering user");
    expect(JSON.parse(response.body).error).toBe("Database error");
  });
});
