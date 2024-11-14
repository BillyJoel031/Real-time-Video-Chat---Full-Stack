// connect.js
exports.handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    console.log("Client connected:", connectionId);

    return { statusCode: 200, body: "Connected." };
  } catch (error) {
    console.error("Connection Error:", error);
    return { statusCode: 500, body: "Failed to connect." };
  }
};
