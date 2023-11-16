const AWS = require("aws-sdk");
const { sendResponse } = require("../../responses");
const db = new AWS.DynamoDB.DocumentClient();
const uuid = require("uuid");

exports.handler = async (event, context) => {
  const roomId = event.pathParameters.roomId;
  const bookingInfo = JSON.parse(event.body);

  const roomResponse = await getRoom(roomId);

  const bookingInfoValidationResult = validateBookingInfo(bookingInfo);

  return sendResponse(200, {
    BookingInfoValidationResult: bookingInfoValidationResult,
  });

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
    Success: true,
    UnexpectedProperties: "None",
    GuestName: {
      property: "Check ok",
      value: "Check ok",
    },
    GuestEmail: {
      property: "Check ok",
      value: "Check ok",
    },
    CheckInDate: {
      property: "Check ok",
      value: "Check ok",
    },
    CheckOutDate: {
      property: "Check ok",
      value: "Check ok",
    },
    TotalGuests: {
      property: "Check ok",
      value: "Check ok",
    },
  };

  const unexpectedProperties = Object.keys(bookingInfo).filter(
    (property) => !expectedProperties.hasOwnProperty(property)
  );

  if (unexpectedProperties.length > 0) {
    validationResult.Success = false;
    validationResult.UnexpectedProperties = `${unexpectedProperties.join(
      ", "
    )}`;
  }

  // Check presence and type of each property
  for (const [property, expectedType] of Object.entries(expectedProperties)) {
    if (!bookingInfo.hasOwnProperty(property)) {
      validationResult.Success = false;
      validationResult[
        property
      ].property = `${property} is missing in booking information`;
    }

    if (typeof bookingInfo[property] !== expectedType) {
      validationResult.Success = false;
      validationResult[
        property
      ].value = `${property} should be of type ${expectedType}`;
    }

    if (expectedType === "string" && bookingInfo[property] === undefined) {
      validationResult.Success = false;
      validationResult[property].value = `${property} does not exist`;
    } else if (
      expectedType === "string" &&
      
      bookingInfo[property].trim() === ""
    ) {
      validationResult.Success = false;
      validationResult[
        property
      ].value = `${property} should not be an empty string`;
    }

    if (
      expectedType === "number" &&
      (bookingInfo[property] < 1 || !Number.isInteger(bookingInfo[property]))
    ) {
      validationResult.Success = false;
      validationResult[
        property
      ].value = `${property} should be a positive integer`;
    }

    if (
      (property === "GuestEmail" && bookingInfo[property]) &&
      !isValidEmailFormat(bookingInfo[property])
    ) {
      validationResult.Success = false;
      validationResult[
        property
      ].value = `${property} is not a valid mail address`;
    }

    if (
      ((property === "CheckInDate" && bookingInfo[property]) || (property === "CheckOutDate" && bookingInfo[property])) &&
      !isValidDateFormat(bookingInfo[property])
    ) {
      validationResult.Success = false;
      validationResult[
        property
      ].value = `${property} should be a date string in this template: 'yyyy-mm-dd'`;
    }
  }

  // All checks done
  return validationResult;
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
