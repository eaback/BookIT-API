const { sendResponse } = require("../../responses");
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const { roomId } = event.pathParameters;

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

        // Remove the 'Bookings' array from the room details
        delete roomDetails.Item.Bookings;

        // Update the room without the 'Bookings' array
        await db.put({
            TableName: 'rooms-db',
            Item: roomDetails.Item
        }).promise();

        return sendResponse(200, { success: true });
    } catch (error) {
        return sendResponse(500, { success: false, message: 'Could not remove bookings from room' });
    }
};

