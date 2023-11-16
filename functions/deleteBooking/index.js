const { sendResponse } = require("../../responses");
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

// DELETE /rooms/bookings/{id}

exports.handler = async (event, context) => {
    const { roomId } = event.pathParameters;
    
    try {
        // Fetch the room data first
        const roomData = await db.get({
            TableName: 'rooms-db',
            Key: { id: roomId }
        }).promise();

        if (!roomData.Item) {
            return sendResponse(404, { success: false, message: 'Room not found' });
        }

        // Delete the room
        await db.delete({
            TableName: 'rooms-db',
            Key: { id: roomId }
        }).promise();

        // Delete associated bookings
        const bookingsToDelete = roomData.Item.bookings || [];

        for (const bookingId of bookingsToDelete) {
            await db.delete({
                TableName: 'rooms-db',
                Key: { id: bookingId }
            }).promise();
        }

        return sendResponse(200, { success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        return sendResponse(500, { success: false, message: 'Could not delete room' });
    }
}
