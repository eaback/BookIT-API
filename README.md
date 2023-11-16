BookIt

An API for booking rooms at a hotel.

URL: (to come)

Endpoints:

-------------
POST /rooms
-------------
postRoom:
For the hotel owner who knows what they are doing, or the developer who needs something to work with.
It has ABSOLUTELY NO error handling. You could add a dog instead of a room if you wanted, but that wouldn't make much sense, would it?
Our rooms have the following structure:
{
			"PricePerNight": 500,
			"Floor": 1,
			"MaxGuests": 1,
			"RoomNumber": "107",
			"Id": "room7",
			"id": "1699892325883",
			"Type": "Single",
			"Info": "Single room with balcony"
		},
		{
			"PricePerNight": 500,
			"Floor": 1,
			"MaxGuests": 1,
			"RoomNumber": "105",
			"Id": "room5",
			"id": "1699892184012",
			"Type": "Single",
			"Bookings": [
				{
					"Status": "Confirmed",
					"CheckInDate": "2024-12-16",
					"TotalNights": 5,
					"TotalPrice": 1500,
					"BookingId": "1dfd03b4-7ab0-4d06-9287-c7aa4bab5e8d",
					"RoomId": "1699892184012",
					"GuestName": "KalleTobbe",
					"GuestEmail": "john.doe@example.se",
					"TotalNigths": 3,
					"CheckOutDate": "2024-12-19",
					"TotalGuests": 1
				}
			],
			"Info": "Single room with garden view"
		}
The observant reader/teacher will notice that there are two ids. The one we are actually using is the one the function adds, which is 'id'. The other one we added in our mock data and it can be ignored!

-------------
GET /rooms
-------------
getRooms:
It gets the rooms. Or dogs.

-------------
DELETE /rooms
-------------
deleteRoom:
If the hotel gets a make over and knocks down some walls, some of the rooms migth be obsolete. Or you can use it to get rid of the dogs.

-------------
GET /rooms/{roomId}
-------------
getRoom:
Take a closer look at that special room.

-------------
POST /bookings/{roomId}
-------------
bookRoom:
This is used to book a specific room.
You need to provide a JSON of the following template:
{
"GuestName": "John Doe",
"GuestEmail": "john.doe@example.se",
"CheckInDate": "2024-12-16",
"CheckOutDate": "2024-12-19",
"TotalGuests": 1
}
Make sure you get it right, or you will be yelled at.
If you provide a properly formatted request, the room will be booked IF it is available, and booking information will be sent as response. (A complete list of previous bookings will also be sent, please ignore if you are not a developer.)

-------------
GET /bookings
-------------
getBookings:
We heard the people working at the hotel wanted to know when to expect guests. We delivered. Returns a list of all bookings, sorted by room.id and room.CheckInDate.

-------------
PATCH /rooms/{roomId}/{bookingId}
-------------
updateBooking:
Some guests can never make up their minds. Luckilly, now they don't have to since a Booking can be updated!

-------------
DELETE /rooms/{roomId}/{bookingId} (Not sure about the endpoint!)
-------------
deleteBookings:
So, you finally read the hotel reviews? Don't worry, you can cancel your booking here.



