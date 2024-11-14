# Video Chat App - Backend

This repository contains the serverless backend for the Video Chat App. It uses AWS Lambda, API Gateway (WebSocket), RDS (MySQL), and MySQL2 for database management. The backend handles real-time signaling, session management, and user connections for video/audio chat.

## Table of Contents

- [Project Setup](#project-setup)
- [Available Scripts](#available-scripts)
- [How to Run](#how-to-run)
- [Deployment](#deployment)

---

## Project Setup

1. Clone the Repository
    ``` bash
    git clone https://gitlab.com/homeproject2674842/back-end.git
    ```

2. Install Dependencies
    ```bash
    npm install
    ```

3. Environment Configuration
Create a .env file in root directory
Add the necessary environment variables:
    ```plaintext
    DB_HOST=env.example
    DB_USER=env.example
    DB_PASSWORD=env.example
    DB_NAME=env.example
    ```
## Available Scripts
1. Deploy to AWS
Deploys the serverless backend to AWS Lambda and API Gateway
    ```bash
    npm run deploy
    ```
2. Run Locally with Serverless Offline
This command runs the serverless application locally for testing and development.
    ```bash
    npm run deploy: offline
    ```
3. Run Tests
Executes unit test using Jest.
    ```bash
    npm run test
    ```
## How to Run
Running Locally
1. Start the server:
    - Use Serverless Offline to run the backend locally, simulating API Gateway and Lambda functions.
    ``` bash
    npm run deploy: offline
    ```
2. Testing API Endpoints:
    - Test WebSocket and REST API requests using tools like Postman or WebSocket clients.
3. Frontend Integration:
    - Make sure the frontend points to http://localhost:3000 for WebSocket connections when running locally.

## Deployment
The backend is deployed to AWS using GitLab CI/CD. Each push to the main branch triggers an automated deployment to AWS Lambda and API Gateway.
1. GitLab CI/CD Setup:
    - Configure .gitlab-ci.yml to define deployment stages for building and deploying your serverless backend to AWS.
2. Serverless Configuration:
    - The serverless.yml file includes all necessary configurations for Lambda functions, API Gateway, and environment variables.
3. Production Link:
    - The backend integrates with the frontend hosted at [Video Chat App](https://main.d2xkbos8gv8b9m.amplifyapp.com/) 
