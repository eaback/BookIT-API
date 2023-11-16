const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;
  const bookingId = event.pathParameters.bookingId; // Extract bookingId from the path parameters
  const updateInfo = JSON.parse(event.body);

  try {
    const updateResponse = await updateBooking(roomId, bookingId, updateInfo);

    return sendResponse(updateResponse.success ? 200 : 400, updateResponse);
  } catch (error) {
    console.error(error);
    return sendResponse(500, { success: false, message: "Internal Server Error" });
  }
};

async function updateBooking(roomId, bookingId, updateInfo) {
  try {
    const data = await db
      .get({
        TableName: "rooms-db",
        Key: {
          id: roomId,
        },
      })
      .promise();

    if (data.Item) {
      const room = data.Item;

      // Find the index of the booking in the Bookings array
      const bookingIndex = room.Bookings.findIndex((booking) => booking.BookingId === bookingId);

      if (bookingIndex !== -1) {
        // Update the booking fields with the new values
        room.Bookings[bookingIndex] = { ...room.Bookings[bookingIndex], ...updateInfo };

        // Update the room in the DynamoDB
        await db
          .update({
            TableName: "rooms-db",
            Key: {
              id: roomId,
            },
            UpdateExpression: "set Bookings = :bookings",
            ExpressionAttributeValues: {
              ":bookings": room.Bookings,
            },
          })
          .promise();

        return { success: true, message: "Booking updated successfully", updatedBooking: room.Bookings[bookingIndex] };
      } else {
        return { success: false, message: "Booking not found" };
      }
    } else {
      return { success: false, message: "Room not found" };
    }
  } catch (error) {
    console.error(error);
    return { success: false, message: "Something went wrong", error: error };
  }
}
