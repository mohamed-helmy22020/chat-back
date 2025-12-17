# 🖥️ Chat App – Backend

A secure, scalable, and real-time backend API for the **Chat App**, built with **Node.js**, **Express**, and **MongoDB (via Mongoose)**. Supports WebSocket communication via **Socket.IO**, user authentication, file uploads, rate limiting, and API documentation.

Download Front End app [Front End Aapp](https://github.com/mohamed-helmy22020/chat-front)

---

## ✨ Features

-   **Real-time messaging** with **Socket.IO**
-   **JWT-based authentication** (login, register, protected routes)
-   **Secure password handling** with `bcryptjs`
-   **MongoDB integration** using **Mongoose ODM**
-   **File & image uploads** via `multer` + **Cloudinary** storage
-   **CORS**, **Helmet**, and **Rate Limiting** for enhanced security
-   **Email verification / notifications** using **Nodemailer**
-   **Auto-generated API documentation** with **Swagger UI**
-   **Environment configuration** via `dotenv`
-   **HTTP status codes** utility for consistent responses

---

## 🛠️ Tech Stack

| Category     | Technologies                     |
| ------------ | -------------------------------- |
| Runtime      | Node.js + TypeScript             |
| Framework    | Express 5                        |
| Database     | MongoDB (via Mongoose)           |
| Auth         | JWT + bcryptjs                   |
| Realtime     | Socket.IO                        |
| File Storage | Cloudinary + multer              |
| Security     | Helmet, CORS, express-rate-limit |
| Email        | Nodemailer                       |
| Dev Tools    | Nodemon, ts-node, TypeScript     |
| Docs         | Swagger UI + swagger-jsdoc       |

---

## 🚀 Getting Started

### Prerequisites

-   Node.js ≥ v18
-   MongoDB instance (local or cloud, e.g., MongoDB Atlas)
-   Cloudinary account (for media uploads)
-   SMTP email service (e.g., Gmail, SendGrid) for email features

### Installation

```bash
# Clone the repo (if not already)
git clone https://github.com/your-username/chat-back.git
cd chat-back

# Install dependencies
npm install
```

### Environment Variables

Create a .env file in the root directory:

```bash
## Mongo DB url
MONGO_URI=MONGO_URI

## Secret for jwt
ACCESS_TOKEN_SECRET=ACCESS_TOKEN_SECRET

## Email account (Gmail) to use it with SMTP to send emails
EMAIL_USER=USER@gmail.com
EMAIL_PASS=EMAIL_PASS

## Cloudinary secrets to upload images and videos
CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET
```

### Development

Run this command

```bash
npm start
```

Starts the server in development mode with Nodemon (auto-restarts on file changes).

The server runs on http://localhost:4000 by default.

### Build (Production)

Run this command

```bash
npm run build
```

Compiles TypeScript to JavaScript in the dist/ folder.

Then run with:

```bash
node dist/index.js
```

## 📚 API Documentation

Once the server is running, access the interactive API docs at:

👉 http://localhost:4000/api-docs

Documentation is auto-generated using Swagger based on JSDoc comments in your route files.

## 🔒 Security Measures

-   Helmet: Sets secure HTTP headers
-   CORS: Restricts frontend origins (CLIENT_URL)
-   Rate Limiting: Prevents brute-force attacks (e.g., 100 requests/15 mins per IP)
-   Password hashing: bcryptjs with salt rounds

## 🧪 Testing

⚠️ No tests are configured yet. Add Jest/Mocha later.

## 📄 License

ISC License

---

Made with ❤️ and ☕
