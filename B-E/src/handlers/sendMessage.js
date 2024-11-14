// sendMessage.js
const mysql = require("mysql2/promise");
const AWS = require("aws-sdk");
const pool = require("../util/index");

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (
    !event.requestContext ||
    !event.requestContext.connectionId ||
    !event.requestContext.domainName ||
    !event.requestContext.stage
  ) {
    console.error(
      "Invalid request context. Ensure this Lambda function is triggered by API Gateway WebSocket."
    );
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request context" }),
    };
  }

  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
  });

  const connectionId = event.requestContext.connectionId;
  let connection;

  try {
    connection = await pool.getConnection();
    const body = JSON.parse(event.body || "{}");
    const { action, roomId, userID } = body;

    if (!action || !roomId || !userID) {
      throw new Error(
        "Missing required fields in message: action, roomId, or userID"
      );
    }

    if (action === "join") {
      console.log(`User ${userID} joining room ${roomId}`);

      // Check current existing session for the room
      const [sessionRows] = await connection.execute(
        "SELECT id FROM Sessions WHERE roomId = ? ORDER BY sessionStart DESC LIMIT 1",
        [roomId]
      );
      let sessionID = sessionRows.length > 0 ? sessionRows[0].id : null;

      // Create new session if none
      if (!sessionID) {
        console.log(`Creating new session for room ${roomId}`);
        const [result] = await connection.execute(
          "INSERT INTO Sessions (sessionStart, roomId, hostId) VALUES (NOW(), ?, ?)",
          [roomId, userID]
        );
        sessionID = result.insertId;
      }

      // Insert new connection into Connections table
      await connection.execute(
        "INSERT INTO Connections (connectionId, userID, sessionID, connectedAt) VALUES (?, ?, ?, NOW())",
        [connectionId, userID, sessionID]
      );

      // Get all users in a room - join with Sessions to get roomId
      const [clientsRows] = await connection.execute(
        "SELECT userID FROM Connections c JOIN Sessions s ON c.sessionID = s.id WHERE s.roomId = ?",
        [roomId]
      );
      const clients = clientsRows.map((row) => row.userID);

      // Notify the joining client
      await apiGateway
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ action: "joined", clients: clients }),
        })
        .promise();
      console.log(
        `Join confirmation sent to ${connectionId} for user ${userID}`
      );

      // Broadcast 'new-peer' message to other clients in the same session
      const [otherConnections] = await connection.execute(
        "SELECT c.connectionId FROM Connections c JOIN Sessions s ON c.sessionID WHERE s.roomId = ? AND c.connectionId <> ?",
        [roomId, connectionId]
      );

      for (const { connectionId: targetConnectionId } of otherConnections) {
        try {
          await apiGateway
            .postToConnection({
              ConnectionId: targetConnectionId,
              Data: JSON.stringify({
                action: "new-peer",
                senderUserID: userID,
              }),
            })
            .promise();
          console.log(`New-peer message sent to ${targetConnectionId}`);
        } catch (err) {
          if (err.statusCode === 410) {
            // GoneException: Connection is stale
            console.warn(`Removing stale connection ${targetConnectionId}`);
            await connection.execute(
              "DELETE FROM Connections WHERE connectionId = ?",
              [targetConnectionId]
            );
          } else {
            console.error(
              `Failed to send new-peer message to ${targetConnectionId}:`,
              err
            );
          }
        }
      }
    } else if (
      action === "offer" ||
      action === "answer" ||
      action === "candidate"
    ) {
      const { targetUserID, data } = body;
      if (!targetUserID || !data) {
        throw new Error(
          "Missing targetUserID or data in offer/answer/candidate message"
        );
      }

      // Get the connectionId of the target user in the same room
      const [rows] = await connection.execute(
        "SELECT c.connectionId FROM Connections c JOIN Sessions s ON c.sessionID = s.id WHERE s.roomId = ? AND c.userID = ?",
        [roomId, targetUserID]
      );

      if (rows.length > 0) {
        const targetConnectionId = rows[0].connectionId;
        try {
          await apiGateway
            .postToConnection({
              ConnectionId: targetConnectionId,
              Data: JSON.stringify({
                action: action,
                data: data,
                senderUserID: userID,
              }),
            })
            .promise();
          console.log(`${action} message sent to ${targetConnectionId}`);
        } catch (err) {
          if (err.statusCode === 410) {
            // GoneException: Connection is stale
            console.warn(`Removing stale connection ${targetConnectionId}`);
            await connection.execute(
              "DELETE FROM Connections WHERE connectionId = ?",
              [targetConnectionId]
            );
          } else {
            console.error(
              `Failed to send ${action} message to ${targetConnectionId}:`,
              err
            );
          }
        }
      } else {
        console.warn(
          `Target userID ${targetUserID} not found in room ${roomId}`
        );
        await apiGateway
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              error: `Target userID ${targetUserID} not found in room`,
            }),
          })
          .promise();
      }
    } else {
      console.warn("Invalid action received:", action);
      await apiGateway
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ error: "Invalid action" }),
        })
        .promise();
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid action" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Message processed." }),
    };
  } catch (error) {
    console.error("Message Handler Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to process message.",
        details: error.message,
      }),
    };
  } finally {
    if (connection) connection.release();
  }
};
