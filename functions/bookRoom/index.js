const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");

async function bookRoom(roomId) {
  const bookingId = uuid.v4();
  const newBooking = {
    //Här skall vi skapa ett nytt booking-objekt
    id: `${bookingId}`,
  };

  try {
    await db
      .update({
        TableName: "rooms-db",
        Key: {
          id: roomId,
        },
        UpdateExpression:
          "set Bookings = list_append(if_not_exists(Bookings, :empty_list), :newBooking)",
        ExpressionAttributeValues: {
          ":newBooking": [newBooking],
          ":empty_list": [],
        },
      })
      .promise();
    return { success: true, booking: newBooking };
  } catch (error) {
    return { success: false, error: error };
  }
}

async function getRoom(roomId) {
  let response = {};
  try {
    const room = await db
      .get({
        TableName: "rooms-db",
        Key: {
          id: roomId,
        },
      })
      .promise();

    if (room.Item) {
      response = { success: true, message: "Room found", room: room.Item };
    } else {
      response = { success: false, message: "Room not found" };
    }
  } catch (error) {
    console.error(error);
    response = {
      success: false,
      message: "Something went wrong",
      error: error,
    };
  }
  return response;
}

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;
  const room = await getRoom(roomId);

  if (!room.success) {
    return sendResponse(400, room);
  }

  const response = await bookRoom(roomId);

  return sendResponse(response.success ? 200 : 400, {
    response: response,
    room: room,
  });
};
