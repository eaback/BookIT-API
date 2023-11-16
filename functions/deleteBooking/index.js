const { sendResponse } = require("../../responses");
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const { roomId, bookingId } = event.pathParameters;

    try {
        // Fetch the room details
        const roomDetails = await db.get({
            TableName: 'rooms-db',
            Key: { id: roomId }
        }).promise();

        // Check if the room exists
        if (!roomDetails.Item) {
            return sendResponse(404, { success: false, message: 'Room not found' });
        }

        const room = roomDetails.Item;
        // Find the index of the booking in the Bookings array
        const bookingIndex = room.Bookings.findIndex((booking) => booking.BookingId === bookingId);

        if (bookingIndex === -1) {
            return sendResponse(404, { success: false, message: 'Booking not found' });
        }

        room.Bookings.splice(bookingIndex, 1);

        // Update the room without the 'Bookings' array
        await db.update({
            TableName: 'rooms-db',
            Key: { id: roomId },
            UpdateExpression: 'set Bookings = :bookings',
            ExpressionAttributeValues: {
                ':bookings': room.Bookings
            }
        }).promise();

        return sendResponse(200, { success: true });
    } catch (error) {
        return sendResponse(500, { success: false, message: 'Could not remove bookings from room' });
    }
};

