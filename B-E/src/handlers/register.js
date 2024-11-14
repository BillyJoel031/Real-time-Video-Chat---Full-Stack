const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const pool = require("../util/index");

exports.handler = async (event) => {
  try {
    console.log("Incoming event:", event);

    // Parse email and password from the event body
    const { email, password } =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" }),
      };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user in the database
    const connection = await pool.getConnection();
    await connection.execute(
      "INSERT INTO Users (email, password) VALUES (?, ?)",
      [email, hashedPassword]
    );
    connection.release();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User registered successfully" }),
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error registering user",
        error: error.message,
      }),
    };
  }
};
