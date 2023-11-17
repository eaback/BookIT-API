// Validate booking information
function validateBookingInfo(bookingBody) {
    // We start by checking we got a proper JSON:
  let bookingInfo = null;

  try {
    bookingInfo = JSON.parse(bookingBody);
  } catch (error) {
    return {
      success: false,
      message: "The booking info needs to be in valid JSON format",
    };
  }

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
  validationResult.bookingInfo = bookingInfo;
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

module.exports = { validateBookingInfo };
