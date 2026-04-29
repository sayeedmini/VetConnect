# VetConnect

VetConnect is a secure veterinary care platform where pet owners can find veterinarians, book appointments, and communicate with vets through private real-time messaging.

## Features

- User and vet authentication
- Vet directory
- Appointment booking
- Secure private messaging
- Real-time chat using Socket.IO
- MongoDB message storage
- Protected API routes
- Role-based access control

## Tech Stack

### Frontend
- React
- Vite
- Axios
- React Router DOM
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Socket.IO
- Helmet
- Express Rate Limit

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- Role-based authorization
- Secure socket authentication
- Private conversations only between valid users
- Environment variables for secrets

## Project Structure

```txt
client/     Frontend React app
server/     Backend Express API