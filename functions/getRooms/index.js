const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {

  try{
  const { Items } = await db
    .scan({
      TableName: "rooms-db",
    })
    .promise();

    if (!Items || !Items.length === 0) {
      return sendResponse(404, {success: false, message: " No rooms found"})
    }

    return sendResponse(200, { success: true, rooms: Items });
  } catch (error){
      console.error("Error:", error);
      return sendResponse(500, {success: false, message: "Internal Server Error"});
    }
};
