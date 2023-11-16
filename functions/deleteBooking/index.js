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

        // Check if the booking exists
        const bookingIndex = roomDetails.Item.booking.findIndex(booking => booking.id === bookingId);
        if (bookingIndex === -1) {
            return sendResponse(404, { success: false, message: 'Booking not found' });
        }

        // Remove the booking from the array
        roomDetails.Item.booking.splice(bookingIndex, 1);

        // Update the room without the deleted booking
        await db.put({
            TableName: 'rooms-db',
            Item: roomDetails.Item
        }).promise();

        return sendResponse(200, { success: true });
    } catch (error) {
        return sendResponse(500, { success: false, message: 'Could not delete booking' });
    }
};
