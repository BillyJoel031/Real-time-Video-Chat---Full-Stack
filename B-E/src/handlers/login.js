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

    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Retrieve the user by email
    const [rows] = await connection.execute(
      "SELECT * FROM Users WHERE email = ?",
      [email]
    );

    // Release the connection back to the pool
    connection.release();

    // Check if user exists
    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    const user = rows[0];

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid email or password" }),
      };
    }

    // If login is successful, return a success message with userId
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        userId: user.id, // Assuming the column name for user ID is 'id'
      }),
    };
  } catch (error) {
    console.error("Error logging in user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error logging in user",
        error: error.message,
      }),
    };
  }
};