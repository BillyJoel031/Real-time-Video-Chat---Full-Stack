const mysql = require("mysql2/promise");
const pool = require("../util/index");

exports.handler = async (event) => {
  let connection;

  try {
    // Get a connection from the pool
    connection = await pool.getConnection();

    const connectionId = event.requestContext.connectionId;

    // Set the disconnectedAt timestamp instead of deleting the record
    const [result] = await connection.execute(
      "UPDATE Connections SET disconnectedAt = NOW() WHERE connectionId = ?",
      [connectionId]
    );

    if (result.affectedRows === 0) {
      console.warn(`Connection with connectionId ${connectionId} not found.`);
      return { statusCode: 404, body: "Connection not found." };
    }

    return { statusCode: 200, body: "Disconnected successfully." };
  } catch (error) {
    console.error("Disconnection Error:", error);
    return { statusCode: 500, body: "Failed to disconnect." };
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};
