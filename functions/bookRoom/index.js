const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;
  const bookingInfo = JSON.parse(event.body);

  const roomResponse = await getRoom(roomId);

  if (!roomResponse.success) {
    //First, we check for the room
    // If it doesn't exist, return with response from getRoom
    return sendResponse(400, roomResponse);
  }
  // Success! Let's extract the room for easier use.
  const room = roomResponse.room;
  // We should have a new Booking object, too:
  const newBooking = createBooking(roomId, room, bookingInfo);

  // Now we have the room and Booking, so we proceed to book the room:
  const bookingResponse = await bookRoom(roomId, newBooking);

  // Lets return whether the operation was successful or not
  return sendResponse(bookingResponse.success ? 200 : 400, {
    response: bookingResponse,
    room: roomResponse,
    bookingInfo: bookingInfo,
  });
};

function createBooking(roomId, room, bookingInfo) {
  const bookingId = uuid.v4();
  const totalNigths = getTotalNigths(
    bookingInfo.CheckInDate,
    bookingInfo.CheckOutDate
  );
  const pricePerNight = room.PricePerNight;
  const totalPrice = totalNigths * pricePerNight;

  let newBooking = bookingInfo;

  newBooking["BookingId"] = `${bookingId}`;
  newBooking["TotalNigths"] = totalNigths;
  newBooking["TotalPrice"] = totalPrice;
  newBooking["RoomId"] = roomId;
  newBooking["Status"] = "Confirmed";

  return newBooking;
}

function getTotalNigths(checkInDate, checkOutDate) {
  const startDate = new Date(checkInDate);
  const endDate = new Date(checkOutDate);
  const totalNigths =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return totalNigths;
}

async function bookRoom(roomId, newBooking) {
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
