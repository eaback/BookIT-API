const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  let data = null;
  try {
    data = await db
      .scan({
        TableName: "rooms-db",
      })
      .promise();
  } catch (error) {
    console.error("Error:", error);
    return sendResponse(error.statusCode, {
      success: false,
      message: "Couldn't get rooms from db",
    });
  }

  if (!data.Items) {
    return sendResponse(404, { success: false, message: "No rooms found" });
  }

  const rooms = data.Items;
  console.log(rooms);
  let allBookings = [];

  for (const room of rooms) {
    if (room.Bookings && Array.isArray(room.Bookings)) {
      //Some error checking
      allBookings = allBookings.concat(room.Bookings);
    }
  }

  if (allBookings.length === 0) {
    return sendResponse(200, {
      success: true,
      message: "There are no bookings yet",
    });
  }

  allBookings.sort((bookingA, bookingB) => {
    // First, compare by id
    const idComparison = bookingA.BookingId.localeCompare(bookingB.BookingId);

    // If id is the same, compare by CheckInDate
    if (idComparison === 0) {
      const checkInDateA = new Date(bookingA.CheckInDate);
      const checkInDateB = new Date(bookingB.CheckInDate);
      return checkInDateA - checkInDateB;
    }

    return idComparison;
  });

  return sendResponse(200, {
    success: true,
    message: "Bookings found",
    bookings: allBookings,
  });
};
