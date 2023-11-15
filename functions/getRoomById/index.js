const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  try {
    const roomId = event.pathParameters.roomId;

    if (!roomId) {
      return sendResponse(400, { success: false, message: "Room ID is missing" });
    }

    const params = {
      TableName: "rooms-db",
      Key: { id: roomId },
    };

    const { Item } = await db.get(params).promise();

    if (!Item) {
      return sendResponse(404, { success: false, message: "Room not found" });
    }

    return sendResponse(200, { success: true, room: Item });
  } catch (error) {
    console.error("Error:", error);
    return sendResponse(500, { success: false, message: "Internal Server Error" });
  }
};
