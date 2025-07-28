
# MERN Online IDE

An online IDE built using the MERN stack that supports multiple languages with real-time input/output using Docker containers.

## Features
- Multi-language support (C, C++, Java, Python, etc.)
- Monaco code editor (like VS Code)
- Live input/output
- Docker sandbox for code execution
- User auth & code save (MongoDB)

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js & npm

### Run Locally
```
cd server
npm install
npm run dev

cd ../client
npm install
npm start
```

### Run with Docker
```
docker-compose up --build
```
