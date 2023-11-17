const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");
const {
  validateBookingInfo,
} = require("../../functions/inputValidation/inputValidation");

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;

  const bookingBody = event.body;

  const bookingInfoValidationResult = validateBookingInfo(bookingBody);

  if (!bookingInfoValidationResult.success) {
    // If the user has provided bad data for the booking request,
    // we tell them so.
    return sendResponse(400, {
      BookingInfoValidationResult: bookingInfoValidationResult,
    });
  }

  // If booking info is ok, we extract it from the response
  const bookingInfo = bookingInfoValidationResult.bookingInfo;
  const roomResponse = await getRoom(roomId);

  if (!roomResponse.success) {
    // Are you trying to book a non-existing room?!
    // You better read this.
    return sendResponse(404, roomResponse);
  }
  // Success! Let's extract the room for easier use.
  const room = roomResponse.room;

  // Is the room big enough for total number of guests?
  const isRoomBigEnoughResponse = isRoomBigEnough(room, bookingInfo);
  if (!isRoomBigEnoughResponse.success) {
    // You should have booked a bigger room!
    return sendResponse(400, isRoomBigEnoughResponse);
  }

  // We check if the wanted dates are available:
  const roomIsFreeResponse = isRoomFree(room, bookingInfo);
  if (!roomIsFreeResponse.success) {
    // No luck! Let's report the sad news
    return sendResponse(400, roomIsFreeResponse);
  }

  // Success! We create a new Booking object:
  const newBooking = createBooking(roomId, room, bookingInfo);

  // Now we have the room and Booking, so we proceed to book the room:
  const bookingResponse = await bookRoom(roomId, newBooking);

  // Lets return whether the operation was successful or not
  return sendResponse(bookingResponse.success ? 200 : 400, {
    success: bookingResponse.success,
    existingBookings: room.Bookings,
    bookingResponse: bookingResponse,
  });
};

// Check if the room is free the wanted date range
function isRoomFree(room, bookingInfo) {
  const bookings = room.Bookings;

  const checkInDate = new Date(bookingInfo.CheckInDate);
  const checkOutDate = new Date(bookingInfo.CheckOutDate);

  let result = { success: true, availability: "Room is available" };

  if (bookings === undefined || bookings.length === 0) {
    return result;
  }

  bookings.every((booking) => {
    const bookedCheckInDate = new Date(booking.CheckInDate);
    const bookedCheckOutDate = new Date(booking.CheckOutDate);
    console.log(bookedCheckInDate, bookedCheckOutDate);
    if (
      (bookedCheckInDate <= checkInDate && checkInDate < bookedCheckOutDate) ||
      (bookedCheckInDate < checkOutDate && checkOutDate <= bookedCheckOutDate)
    ) {
      result.success = false;
      result.availability = "Room is already booked.";
      return false;
    }
    return true;
  });
  return result;
}

function isRoomBigEnough(room, bookingInfo) {
  const maxGuests = room.MaxGuests;
  const totalGuests = bookingInfo.TotalGuests;
  let result = {
    success: totalGuests <= maxGuests,
    bigEnough: "The room can accommodate all guests.",
  };

  if (!result.success) {
    result.bigEnough =
      "The room cannot accommodate all guests. Try to book a bigger room, or book more than one room.";
  }

  return result;
}

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
  newBooking["TotalNights"] = totalNigths;
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
      response = { success: true, message: "Room found", room: room };
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
