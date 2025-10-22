# NeuroViz-backend
# 🧠 NeuroViz Backend

Welcome to the **NeuroViz Backend**, the server-side component of the NeuroViz platform — a neuro-assistive mind mapping and visualization application.  
This backend is built with **[Node.js]**(https://nodejs.org/en), **[TypeScript]**(https://www.typescriptlang.rog/), **[Express]**(https://expressjs.com/), and **[Prisma ORM]**(https://www.prisma.io/), powered by **[PostgreSQL]**(https://www.postgresql.org/) (hosted on *[NeonDB]*(https://neon.com/)).

---

## 🚀 Project Overview

**NeuroViz Backend** provides secure and efficient REST APIs for:
- User authentication and profile management
- Mind map creation, retrieval, and updates
- Database operations via Prisma ORM
- Clean error handling and modular architecture

---

## 🏗️ Tech Stack

| Category | Technology |
|-----------|-------------|
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (NeonDB) |
| Environment Management | dotenv |
| Build Tool | tsc (TypeScript Compiler) |
| Dev Runner | ts-node-dev |

---

## Prerequisites:
### Nodejs and Npm(Node Package Manager)
You should need **Nodejs and Node Package Manager** for this project installed in your system. 
🔗[Download it from the official site.](https://nodejs.org/en/download). 
**Or installed via terminal:**

```bash
#for Linux(Debian or Ubuntu-based)
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
#for macOS
brew install node
#to verify installation
node -v
npm -v
```
---
### Yarn
Then you should install Yarn. To install it in your machine, do the following.

```bash
npm install --global yarn
# or
npm install -g yarn
```
---

## 📁 Project Structure

NeuroViz-backend/
├── prisma/
│ ├── schema.prisma # Prisma schema for DB models
│ └── migrations/ # Prisma migration history
│
├── src/
│ ├── app.ts # Express app configuration
│ ├── server.ts # Entry point to start server
│ │
│ ├── auth/
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── auth.dto.ts
│ │ └── auth.routes.ts
│ │
│ ├── base/
│ │ ├── base.router.ts # Central router entry point
│ │ └── interface.ts
│ │
│ ├── config/
│ │ ├── core.ts # Common enums
│ │ └── database.ts
│ │
│ ├── features/
│ │ └── user/
│ │ ├── user.controller.ts
│ │ ├── user.service.ts
│ │ ├── user.dto.ts
│ │ ├── user.interface.ts
│ │ └── user.routes.ts
│ │
│ │
│ ├── middlewares/
│ │ ├── errorHandler.ts # Global error handling middleware
│ │ ├── dtoValidation.ts
│ │ ├── jwtVerification.ts
│ │ └── responseHandler.ts # Unified response format
│ │
│ └── utils/
│  └── util.ts # Helper utilities (e.g., getUserResponse)
│
├── .env # Environment variables (not committed)
├── .gitignore
├── package.json
├── tsconfig.json
├── yarn.lock
└── README.md

---

## 🚀 Project Setup
### Clone the repo

```bash
git clone https://github.com/ProgrammerSnehasish/NeuroViz-backend.git
cd NeuroViz-backend
```
**and then to get node modules and required packages(dependencies), enter in terminal**

```bash
yarn install
```
**and then to start the development server, just enter**

```bash
yarn dev
```

---

📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgements
Thanks to all the open-source community!

---

💬 Author
-Snehasish Das
Developer • Cyber Security Enthusiast • NeuroViz Project Member

-Rounak Saha
Developer • Cyber Security Enthusiast • NeuroViz Project Lead

---

## 🧩 NeuroViz — Empowering neurodivergent learners with intelligent visualization.