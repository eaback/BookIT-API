const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;
  const bookingInfo = JSON.parse(event.body);

  const bookingInfoValidationResult = validateBookingInfo(bookingInfo);

  if (!bookingInfoValidationResult.success) {
    return sendResponse(400, {
      BookingInfoValidationResult: bookingInfoValidationResult,
    });
  }
  const roomResponse = await getRoom(roomId);

  if (!roomResponse.success) {
    //We check for the room
    // If it doesn't exist, return with response from getRoom
    return sendResponse(404, roomResponse);
  }
  // Success! Let's extract the room for easier use.
  const room = roomResponse.room;

  // We check if the wanted dates are available:
  const roomIsFreeResponse = isRoomFree(room, bookingInfo);
  if (!roomIsFreeResponse.success) {
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

  if(bookings === undefined || bookings.length === 0) {
    return result;
  }

  bookings.every((booking) => {
    const bookedCheckInDate = new Date(booking.CheckInDate);
    const bookedCheckOutDate = new Date(booking.CheckOutDate);
    console.log(bookedCheckInDate, bookedCheckOutDate)
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

// Validate booking information
function validateBookingInfo(bookingInfo) {
  // Define expected properties and their types
  const expectedProperties = {
    GuestName: "string",
    GuestEmail: "string",
    CheckInDate: "string",
    CheckOutDate: "string",
    TotalGuests: "number",
  };

  let validationResult = {
    // we start off optimistically, adding failed checks later
    success: true,
    UnexpectedProperties: "None",
    GuestName: {
      success: true,
      property: "Check ok",
      value: "Check ok",
    },
    GuestEmail: {
      success: true,
      property: "Check ok",
      value: "Check ok",
    },
    CheckInDate: {
      success: true,
      property: "Check ok",
      value: "Check ok",
    },
    CheckOutDate: {
      success: true,
      property: "Check ok",
      value: "Check ok",
    },
    TotalGuests: {
      success: true,
      property: "Check ok",
      value: "Check ok",
    },
  };

  const unexpectedProperties = Object.keys(bookingInfo).filter(
    (property) => !expectedProperties.hasOwnProperty(property)
  );

  if (unexpectedProperties.length > 0) {
    validationResult.success = false;
    validationResult.UnexpectedProperties = `${unexpectedProperties.join(
      ", "
    )}`;
  }

  // Check presence and type of each property
  for (const [property, expectedType] of Object.entries(expectedProperties)) {
    if (!bookingInfo.hasOwnProperty(property)) {
      validationResult.success = false;
      validationResult[
        property
      ].property = `${property} is missing in booking information`;
    }

    if (typeof bookingInfo[property] !== expectedType) {
      validationResult.success = false;
      validationResult[property].success = false;
      validationResult[
        property
      ].value = `${property} should be of type ${expectedType}`;
    }

    if (expectedType === "string" && bookingInfo[property] === undefined) {
      validationResult.success = false;
      validationResult[property].success = false;
      validationResult[property].value = `${property} does not exist`;
    } else if (
      expectedType === "string" &&
      bookingInfo[property].trim() === ""
    ) {
      validationResult.success = false;
      validationResult[
        property
      ].value = `${property} should not be an empty string`;
    }

    if (
      expectedType === "number" &&
      (bookingInfo[property] < 1 || !Number.isInteger(bookingInfo[property]))
    ) {
      validationResult.success = false;
      validationResult[property].success = false;
      validationResult[
        property
      ].value = `${property} should be a positive integer`;
    }

    if (
      property === "GuestEmail" &&
      bookingInfo[property] &&
      !isValidEmailFormat(bookingInfo[property])
    ) {
      validationResult.success = false;
      validationResult[property].success = false;
      validationResult[
        property
      ].value = `${property} is not a valid mail address`;
    }

    if (
      ((property === "CheckInDate" && bookingInfo[property]) ||
        (property === "CheckOutDate" && bookingInfo[property])) &&
      !isValidDateFormat(bookingInfo[property])
    ) {
      validationResult.success = false;
      validationResult[property].success = false;
      validationResult[
        property
      ].value = `${property} should be a date string in this template: 'yyyy-mm-dd'`;
    }
  }

  if (validationResult.success) {
    const dateRangeValidationResult = isValidDateRange(
      bookingInfo.CheckInDate,
      bookingInfo.CheckOutDate
    );
    validationResult.success = dateRangeValidationResult.success;
    validationResult.ValidDateRange = dateRangeValidationResult;
  }

  // All checks done
  return validationResult;
}

function isValidDateRange(checkInString, checkOutString) {
  let result = {
    success: true,
    range: "Check ok",
    setInFuture: "Check ok",
  };

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // It should be possible to book a room today.
  //Note: I should maybe look into this. Should probably be a deadline: No bookings after a certain time.
  const checkInDate = new Date(checkInString);
  const checkOutDate = new Date(checkOutString);

  if (currentDate > checkInDate) {
    result.success = false;
    result.setInFuture = "The checkInDate must be set in the future";
  }
  if (checkInDate >= checkOutDate) {
    result.success = false;
    result.range =
      "The checkOutDate is set before or on the same date as the checkInDate";
  }

  return result;
}

function isValidDateFormat(dateString) {
  // Regular expression for yyyy-mm-dd format
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

  return dateFormatRegex.test(dateString);
}

function isValidEmailFormat(emailString) {
  // Regular expression for (local part)@(domain part).(top level domain)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(emailString);
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
