# NeuroViz-backend
# 🧠 NeuroViz Backend

Welcome to the **NeuroViz Backend**, the server-side component of the NeuroViz platform — a neuro-assistive mind mapping and visualization application.  
This backend is built with [Node.js](https://nodejs.org/en), [TypeScript](https://www.typescriptlang.rog/), [Express](https://expressjs.com/), and [Prisma ORM](https://www.prisma.io/), powered by [PostgreSQL](https://www.postgresql.org/) (hosted on [NeonDB](https://neon.com/)).

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
|NLP| wink-nlp and others(local[python], hugging face)|
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

## 📁 Backend Folder Structure
```bash
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
│ │   ├── user/
│ │   │   ├── user.controller.ts
│ │   │   ├── user.service.ts
│ │   │   ├── user.dto.ts
│ │   │   ├── user.interface.ts
│ │   │   └── user.routes.ts
│ │   │
│ │   ├── mindmap/
│ │   │   ├── mindmap.controller.ts
│ │   │   ├── mindmap.ai.service.ts
│ │   │   ├── mindmap.service.ts
│ │   │   ├── mindmap.dto.ts
│ │   │   ├── mindmap.type.ts
│ │   │   └── mindmap.routes.ts
│ │   │
│ │   ├── nlp/
│ │   │   ├── nlp.dto.ts
│ │   │   ├── nlp.controller.ts
│ │   │   ├── nlp.router.ts
│ │   │   └── nlp.service.ts
│ │   │
│ │   ├── cognitive_profile/
│ │   │   ├── cognitiveProfile.dto.ts
│ │   │   ├── cognitiveProfile.controller.ts
│ │   │   ├── cognitiveProfile.service.ts
│ │   │   └── cognitiveProfile.routes.ts
│ │   │
│ │   ├── emotion/
│ │   │   ├── emotion.dto.ts
│ │   │   ├── emotion.controller.ts
│ │   │   ├── emotion.service.ts
│ │   │   └── emotion.routes.ts
│ │   │
│ │   ├── feedback/
│ │   │   ├── feedback.dto.ts
│ │   │   ├── feedback.controller.ts
│ │   │   ├── feedback.service.ts
│ │   │   └── feedback.routes.ts
│ │   │
│ │   ├── adapt/
│ │   │   ├── adapt.controller.ts
│ │   │   ├── adapt.service.ts
│ │   │   └── adapt.routes.ts
│ │   │
│ │   ├── content/
│ │   │   ├── content.controller.ts
│ │   │   ├── content.service.ts
│ │   │   └── content.routes.ts
│ │   │
│ │   └── admin/
│ │       ├── admin.controller.ts
│ │       ├── admin.service.ts
│ │       └── admin.routes.ts
│ │
│ ├── middlewares/
│ │ ├── errorHandler.ts # Global error handling middleware
│ │ ├── dtoValidation.ts
│ │ ├── jwtVerification.ts
│ │ └── responseHandler.ts # Unified response format
│ ├─ utils/
│ │  ├─ env.ts
│ │  └─ util.ts
│ └─ types/
│     └─ express.d.ts
│
├── .env # Environment variables (not committed)
├── .gitignore
├── package.json
├── tsconfig.json
├── yarn.lock
└── README.md
```
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
**to initialize Prisma**
```bash
yarn prisma:migrate
#and
yarn prisma:generate
```
**to compile the project, use**
```bash
yarn build
```
**and then to start the development server, just enter**

```bash
yarn dev
```
## 🧰 Scripts
|**Command**|	**Description**|
|:------|:-------------|
|`yarn dev`|	Start dev server using ts-node-dev|
|`yarn build`|	Compile TypeScript to JavaScript (dist/)|
|`yarn start`|	Run compiled server from `dist/`|
|`yarn prisma:migrate`|	Run database migrations|
|`yarn prisma:generate`|	Generate Prisma client|
|`yarn prisma:studio`|	Launch Prisma Studio (DB GUI)|
|`yarn lint`|	Check TypeScript errors|
---
## 🌐 API Endpoints
|**Method**|**Route**|**Endpoint Description**|
|:---------|:--------|:-----------------------|
|**Authentication**|
|POST| `/api/auth/signup`| Creating new user / signup|
|POST| `/api/auth/signin`| Signin / Login |
|**User**|
|GET|`/api/users/email/:email`| Get user by email |
|GET|`/api/users/:id` | Get user by id |
|PUT|`/api/users/update`| Update user details|
|DELETE|`/api/users/delete/:id`| Delete User by id.|
|**Mindmap**|
|POST|`/api/mindmaps/create`| Create Mindmap|
|POST|`/api/mindmaps/generate`| Generate Mindmap using Ai|
|GET|`/api/mindmaps/:mindmapId`| Get Mindmap by Mindmap id|
|GET|`/api/mindmaps/user/:userId`| Get Mindmaps by user id|
|PUT|`/api/mindmaps/update/:mindmapId`| Update mindmap by mindmap id|
|GET|`/api/mindmaps/:mindmapId/jpeg`|Download Mindmap as JPEG|
|GET|`/api/mindmaps/:mindmapId/pdf`|Download Mindmap as PDF|
|DELETE|`/api/mindmaps/delete/:mindmapId`| Delete Mindmap by mindmap id|
|**NLP**|
|POST|`/api/nlp/summarize`| Summarize Text|
|POST|`/api/nlp/detect-toxicity`| Detect toxicity|
|POST|`/api/nlp/sentiment`| Sentiment Analysis|
|POST|`/api/nlp/keywords`| Extract Keywords|
|POST|`/api/nlp/classify`| Classify Text|
|POST|`/api/nlp/entities`| Named Entity Recognition|
|**Cognitive Profiling**|
|POST|`/api/cognitive/update`|Update cognitive profile|
|GET|`/api/cognitive/user/:userId`|Get Cognitive Profile by user Id|
|**Emotion Profiling**|
|POST|`/api/emotion/log`|Log new emotion|
|GET|`/api/emotion/user/:userId`|Get Emotion Log by user Id|
|**Feedback**|
|POST|`/api/feedback/add`|Add new feedback|
|GET|`/api/feedback/user/:userId`|Get feedback by user Id|
|**Others**|
|POST|`/api/adapt/trigger/user/:userid`|Trigger Adaptation Manually(Interface Adaptation)|
|POST|`/api/content/summarize`|Summarize Content|
|GET|`/api/admin/overview`|Admin Overview|
## 🧹 Graceful Shutdown

On **`Ctrl+C`** or stop signal:

Prisma disconnects cleanly.

Server closes connections gracefully.

Logs:

🛑 Shutting down gracefully...
🧹 Prisma disconnected and server closed.

## 🧭 Future Enhancements

- JWT-based authentication

- Role-based access control (RBAC)

- AI-based mindmap generation

- Caching and performance optimization

- GraphQL API support

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgements
Thanks to all the open-source community!

---

## 💬 Author
- Snehasish Das
Developer • Cyber Security Enthusiast • NeuroViz Project Member

## 💬 Collaborators
- Rounak Saha
> Developer • Cyber Security Enthusiast • NeuroViz Project Lead

- Puskar Sarkar
> Developer • Cyber Security Enthusiast • NeuroViz Project Member

- Sagnika Mitra
> Developer • Cyber Security Enthusiast • NeuroViz Project Member

---

# 🧩 NeuroViz — Empowering neurodivergent learners with intelligent visualization.
#### An adaptive and creative mind canvas for Neurodivergent Students

*NeuroViz* is an AI-powered adaptive visual learning system designed to support *neurodivergent learners* (e.g., students with ADHD, Autism, Dyslexia, etc.) by transforming educational content into interactive visual formats — such as *mind maps, infographics, and visual flows* — tailored to individual cognitive and emotional profiles.

NeuroViz focuses on enhancing comprehension, retention, and engagement through *adaptive visualization*.  
The system analyzes a student’s behavior, emotional state, and learning preferences to dynamically adjust how educational content is presented.

---

## 🧩 System Architecture (Flow Summary)

### 1. *User Registration / Profile*
- Collects user details: Name, neuro-type, and learning preferences.  
- Initializes a personalized learning session.

---

### 2. *Cognitive Profiling Module*
- Tracks *eye/cursor movement* and *attention span*.  
- Detects engagement levels.  
- Builds an initial *neuro-learning profile* for each user.

---

### 3. *Content Input Module*
- Accepts learning content (text, notes, documents, etc.).  
- Automatically:
  - Summarizes key points.
  - Extracts keywords and relationships.
  - Sends structured data to the Visual Mapping Engine.

---

### 4. *Adaptive Visual Mapping Engine*
- Converts summarized content into *visual representations*:
  - Mind maps, infographics, or flow diagrams.
- Adapts visual elements based on user profile:
  - Color themes, complexity levels, and layout styles.

---

### 5. *Visual Learning Interface (Frontend)*
- Displays interactive visualizations.
- Supports *drag-and-drop, **color customization, and **TTS/ST-assistive tools* for accessibility.
- Provides a user-friendly experience optimized for different neuro-types.

---

### 6. *Emotion & Focus Detection Module*
- Uses *webcam or cursor tracking* to monitor:
  - Fatigue, distraction, and emotional cues.
- Sends real-time feedback to the adaptation system for live adjustments.

---

### 7. *Feedback Collection Module*
- Gathers user feedback based on:
  - Ratings, engagement, and performance data.
- Dynamically updates the *Neuro–Learning Profile* for continuous personalization.

---

## 🧩 Diagram Reference

The following flow diagram represents the overall architecture and data flow of the NeuroViz system:

> *NeuroViz: Adaptive Visual Learning Companion for Neurodivergent Students*  
> ![Architecture_&_Dataflow_Diagram](./Image/Architecture_&_Dataflow_Diagram.jpg)

---
## 🧠 Core Features

- Adaptive visualization based on learning type.
- Emotion-aware and attention-responsive interface.
- AI summarization and keyword extraction.
- Continuous personalization via user feedback.
- Multi-format visual outputs (mind map, infographic, flowchart).
- Accessibility tools: *Text-to-Speech (TTS)* and *Speech-to-Text (ST)*.

---

## 🎯 Objectives

1. Support neurodivergent learners through tailored visual learning.  
2. Reduce cognitive overload by adapting visual complexity.  
3. Enhance focus and retention using emotion-aware feedback loops.  
4. Build an inclusive, assistive educational platform.

---

## 📈 Future Enhancements

- Integration with Learning Management Systems (LMS).
- Gamified learning dashboards and analytics.
- Multi-language and voice-assistive support.
- Advanced emotion tracking via micro-expressions.

---

## 💡 Inspiration

Inspired by the need for *inclusive educational technologies, NeuroViz bridges the gap between cognitive diversity and modern learning — ensuring that ***every mind learns visually, effectively, and confidently****.