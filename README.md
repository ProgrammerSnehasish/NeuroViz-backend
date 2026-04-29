# NeuroViz-backend
# 🧠 NeuroViz Backend

Welcome to the **NeuroViz Backend**, the server-side component of the NeuroViz platform — a neuro-assistive mind mapping and visualization application.  
This backend is built with [Node.js](https://nodejs.org/en), [TypeScript](https://www.typescriptlang.rog/), [Express](https://expressjs.com/), and [Prisma ORM](https://www.prisma.io/), powered by [PostgreSQL](https://www.postgresql.org/) (hosted on [NeonDB](https://neon.com/)).

---

## 🚀 Project Overview

**NeuroViz Backend** is a scalable, AI-powered server-side system that drives the core intelligence of the NeuroViz platform. It provides secure and efficient REST APIs for managing users, generating adaptive visual learning content, and enabling role-based workflows for Students, Teachers, and Admins.

The backend supports AI-driven mind map generation, NLP processing, cognitive and emotion profiling, and adaptive learning triggers, ensuring personalized learning experiences for neurodivergent students. Built with a modular architecture, it ensures clean error handling, strong security, and reliable database operations using **Prisma ORM and PostgreSQL**.

**NeuroViz Backend** provides secure and efficient REST APIs for:
- User authentication and profile management
- Mind map creation, retrieval, and updates
- Database operations via Prisma ORM
- Clean error handling and modular architecture
- Clean Admin, Teacher and Student Route handling

### 🔑 Core Capabilities

- ***Secure Authentication & RBAC*** – JWT-based login with role enforcement for Student, Teacher, and Admin via middleware.

- ***User & Profile Management*** – Centralized user APIs with independent cognitive and emotional profiling for long-term personalization.

- ***AI-Powered Mind Map Engine*** – Manual and AI-generated mind maps with storage, export (JPEG/PDF), and teacher review workflows.

- ***NLP & AI Processing*** – Text summarization, keyword extraction, sentiment analysis, NER, classification, and toxicity detection.

- ***Cognitive Profiling System*** – Dynamic tracking of attention, engagement, and learning preferences to adapt content delivery.

- ***Emotion & Focus Tracking*** – Emotion logging with trend analysis (stress, fatigue, motivation) for adaptive learning triggers.

- ***Adaptive Learning Engine*** – Automatically adjusts visualization complexity, UI, and content strategy using cognitive–emotional signals.

- ***Teacher Intelligence Layer*** – Analytics-driven tools for assignments, grading, mind map review, student groups, and AI insights.

- ***Teacher Dashboard & Insights*** – Class heatmaps, progress tracking, student comparison, feedback, and notification systems.

- ***Admin Control & Observability*** – System health monitoring, user management, activity logs, and usage analytics.

- ***Robust Architecture*** – Modular, feature-based design with Prisma ORM, clean separation of concerns, and scalable structure.

- ***Security & Reliability*** – Middleware authorization, DTO validation, activity auditing, and graceful shutdown handling.

- ***Target Users*** – Built for neurodivergent students, insight-driven educators, inclusive institutions, and learning researchers.

---

## 🏗️ Tech Stack

| Category | Technology |
|-----------|-------------|
| Language | TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (NeonDB) |
|NLP| wink-nlp and others(local[python], huggingface models)|
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
├── .yarn/
│ └── install-state.gz
│
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
│ │ ├── auth.helper.ts
│ │ ├── auth.dto.ts
│ │ └── auth.routes.ts
│ │
│ ├── base/
│ │ ├── base.router.ts # Central router entry point
│ │ ├── ActivityLogService.ts
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
│ │   │   └── user.router.ts
│ │   │
│ │   ├── mindmap/
│ │   │   ├── export/
│ │   │   │ ├── mindmap.export.controller.ts
│ │   │   │ └── mindmap.export.service.ts
│ │   │   ├── mindmap.controller.ts
│ │   │   ├── mindmap.ai.service.ts
│ │   │   ├── mindmap.service.ts
│ │   │   ├── mindmap.dto.ts
│ │   │   ├── mindmap.type.ts
│ │   │   └── mindmap.router.ts
│ │   │
│ │   ├── nlp/
│ │   │   ├── nlp.dto.ts
│ │   │   ├── nlp.controller.ts
│ │   │   ├── nlp.router.ts
│ │   │   └── nlp.service.ts
│ │   │
│ │   ├── behavior/
│ │   │   ├── behavior.controller.ts
│ │   │   ├── behavior.service.ts
│ │   │   └── behavior.router.ts
│ │   │
│ │   ├── cognitive_profile/
│ │   │   ├── cognitive.engine.ts
│ │   │   ├── cognitiveProfile.dto.ts
│ │   │   ├── cognitiveProfile.controller.ts
│ │   │   ├── cognitiveProfile.service.ts
│ │   │   └── cognitiveProfile.router.ts
│ │   │
│ │   ├── emotion/
│ │   │   ├── emotion.dto.ts
│ │   │   ├── emotion.controller.ts
│ │   │   ├── emotion.service.ts
│ │   │   └── emotion.router.ts
│ │   │
│ │   ├── feedback/
│ │   │   ├── feedback.dto.ts
│ │   │   ├── feedback.controller.ts
│ │   │   ├── feedback.service.ts
│ │   │   └── feedback.router.ts
│ │   │
│ │   ├── adapt/
│ │   │   ├── adapt.controller.ts
│ │   │   ├── adapt.service.ts
│ │   │   └── adapt.router.ts
│ │   │
│ │   ├── admin/
│ │   │   ├── admin.controller.ts
│ │   │   ├── admin.dto.ts
│ │   │   ├── admin.service.ts
│ │   │   └── admin.router.ts
│ │   │
│ │   ├── teachers/
│ │   │   ├── Dashboard/
│ │   │   │   ├── teacher.dashboard.controller.ts
│ │   │   │   ├── teacher.dashboard.dto.ts
│ │   │   │   ├── teacher.dashboard.router.ts
│ │   │   │   └── teacher.dashboard.service.ts
│ │   │   │
│ │   │   ├── Services/
│ │   │   │   ├── teacher.assignment.service.ts
│ │   │   │   ├── teacher.review.service.ts
│ │   │   │   ├── teacher.mail-log.service.ts
│ │   │   │   ├── teacher.service.ts
│ │   │   │   └── teacher.student.service.ts
│ │   │   │
│ │   │   ├── teacher.controller.ts
│ │   │   ├── teacher.dto.ts
│ │   │   └── teacher.router.ts
│ │   │
│ │   ├── content/
│ │   │   ├── content.controller.ts
│ │   │   ├── content.service.ts
│ │   │   └── content.routes.ts
│ │   │
│ │   └── admin/
│ │       ├── admin.controller.ts
│ │       ├── admin.dto.ts
│ │       ├── admin.service.ts
│ │       └── admin.routes.ts
│ │
│ ├── middlewares/
│ │ ├── errorHandler.ts # Global error handling middleware
│ │ ├── enforceAdmin.ts
│ │ ├── enforceTeacher.ts
│ │ ├── enforceTeacherStudentRelation.ts
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
├── .yarnrc.yml
├── LICENSE
├── LICENSE # MIT License
├── package-lock.json
├── prisma.config.js
├── package.json
├── tsconfig.json
├── yarn.lock
└── README.md
```
---
## Backend Dataflow Diagram (Till now)
  
> ![NeuroViz_backend_flowchart](./Image/Neuroviz%20Backend%20Flow%20Diagram.jpg)
---

## 🚀 Project Setup
### Clone the repo

```bash
git clone https://github.com/ProgrammerSnehasish/NeuroViz-backend.git
cd NeuroViz-backend
```
**and then to get node modules and required packages(dependencies), enter in terminal**

```bash
yarn config set nodeLinker node-modules #(If in case you see pnp error.)
#then
yarn install
```
**to initialize Prisma**
```bash
yarn prisma migrate
#and
yarn prisma generate
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
|`yarn prisma migrate`|	Run database migrations|
|`yarn prisma generate`|	Generate Prisma client|
|`yarn prisma studio`|	Launch Prisma Studio (DB GUI)|
|`yarn lint`|	Check TypeScript errors|
---
## 🌐 API Endpoints
|**Method**|**Route**|**Endpoint Description**|
|:---------|:--------|:-----------------------|
|**Authentication**|
|**Signup**|
|POST| `/api/auth/signup`| Creating new user / signup|
|**Primary Signin**|
|POST| `/api/auth/signin`| Signin / Login |
|**OTP based signin**|
|POST|`/api/auth/otp/request`| Reqest OTP for OTP based login |
|POST|`/api/auth/otp/verify`| OTP verification for OTP based login and login |
|**Reset Password**|
|POST|`/api/auth/password/forgot`| Password Forget |
|POST|`/api/auth/password/verify-otp`| Verify OTP for Password Rest |
|POST|`/api/auth/password/reset`| Reset Password |
|**Google OAuth based(Signup & Signin) and Passkey based Signin**|
|POST|`/api/auth/google`| Google OAuth based Signin/Signup(TODO) |
|POST|``| Passkey based Signin(TODO) |
|**Signout**|
|POST|``| Signout |
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
|GET|`/api/mindmaps/:mindmapId/pdf`|Download Mindmap as PDF(Although it is recomended to fetch from frontend, for visualization download, not a part of backend.)|
|DELETE|`/api/mindmaps/delete/:mindmapId`| Delete Mindmap by mindmap id(Although it is recomended to fetch from frontend, for visualization download, not a part of backend.)|
|**NLP**|
|POST|`/api/nlp/summarize`| Summarize Text|
|POST|`/api/nlp/detect-toxicity`| Detect toxicity|
|POST|`/api/nlp/sentiment`| Sentiment Analysis|
|POST|`/api/nlp/keywords`| Extract Keywords|
|POST|`/api/nlp/classify`| Classify Text|
|POST|`/api/nlp/entities`| Named Entity Recognition|
|**Behavior Tracking**|
|POST|`/api/behavior/track`|Track User Behaviour for cognitive profiling.|
|**Cognitive Profiling**|
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
|**Teacher Routes**|
|*Analytics & Performance*|		
|GET|	`/api/teacher/student/:userId/analytics`|	Get analytics for a specific student|
|GET|	`/api/teacher/student/:userId/summarize`|	Summarize student performance|
|POST|	`/api/teacher/mindmap/:mindmapId/review`|	Review or approve a mindmap|
|GET|	`/api/teacher/class/overview`|	Get teacher’s overall class overview|
|*Assignments*|		
|POST|	`/api/teacher/assignment/create`|	Create a new assignment|
|GET|	`/api/teacher/get/assignments`|	Get all assignments created by teacher|
|GET|	`/api/teacher/assignment/:assignmentId`|	Get specific assignment details|
|PUT|	`/api/teacher/assignment/update/:assignmentId`|	Update an existing assignment|
|DELETE|	`/api/teacher/assignment/:assignmentId`|	Delete an assignment|
|POST|	`/api/teacher/assignment/evaluate`|	Evaluate an assignment (manual/auto)|
|POST|	`/api/teacher/assignment/submission/evaluate`|	Evaluate a specific student submission|
|*Review + Feedback*|		
|POST|	`/api/teacher/review`|	Review and grade a submission|
|GET|	`/api/teacher/submissions/teacher`|	Get all submissions for teacher|
|GET|	`/api/teacher/submission/:submissionId/regenerate-summary`|	Regenerate AI summary for submission|
|*Student Management*|		
|POST|	`/api/teacher/group/create`|	Create a new student group|
|PUT|	`/api/teacher/groups/:groupId`|	Update group details|
|DELETE|	`/api/teacher/groups/:groupId`|	Delete a group|
|POST|	`/api/teacher/group/members/add`|	Add multiple students to a group|
|POST|	`/api/teacher/group/student/add`|	Add a single student to a group|
|DELETE|`/api/teacher/group/:groupId/student/:studentId/remove`|Remove a student from a group|		
|GET|	`/api/teacher/students/search`|	Search students by name or email|
|POST|	`/api/teacher/students/register`|	Register a new student under the teacher|
|POST|	`/api/teacher/students/invite`|	Invite a student by email|
|POST|	`/api/teacher/students/invite/group`|	Invite a student by email to join a group|
|*Mail*|
|GET|`/api/teacher/mail/logs`|Get Recent Mail log for teacher |
|GET|`/api/teacher/mail/log/:id`|Get specific Mail log by log id|
|**Teacher Dashboard Routes**|
|*Overview & Heatmap*|		
|GET|	`/api/teacherDashboard/overview`|	Get complete teacher dashboard overview|
|GET|	`/api/teacherDashboard/heatmap`|	Get class heatmap for engagement|
|*Student Progress*|		
|GET|	`/api/teacherDashboard/student/:studentId/progress`|	Get progress data for a student|
|GET|	`/api/teacherDashboard/student/:studentId/report`|	Get detailed performance report|
|GET|	`/api/teacherDashboard/student/:studentId/strategy`|	Get adaptive strategy for student|
|*Class Insights*|		
|GET|	`/api/teacherDashboard/class/strategy`|	Get adaptive class strategy|
|GET|	`/api/teacherDashboard/compare`|	Compare progress between students|
|GET|	`/api/teacherDashboard/insights/teaching`|	Get adaptive teaching insights|
|GET|	`/api/teacherDashboard/insights/assignments`|	Get assignment insights|
|*Feedback & Notifications*|		
|POST|	`/api/teacherDashboard/feedback`|	Submit feedback for student/class|
|GET|	`/api/teacherDashboard/feedback/overview`|	Get feedback overview|
|GET|	`/api/teacherDashboard/notifications`|	Get all notifications for teacher|
|POST|	`/api/teacherDashboard/notifications/create`|	Post a new notification to students|
|PATCH|	`/api/teacherDashboard/notifications/:id/read`|	Mark notification as read|
|**Admin Routes**|
|GET|`/api/admin/overview`| An Brief overview of System Usage.|
|GET|`/api/admin/health`|An Brief overview of System health.|
|GET|`/api/admin/activity/logs`|Fetch details of recent activity log.|
|GET|`/api/admin/users`|Fetch Brief Details of each Users(incl. Admin).|
|POST|`/api/admin/user/status`|Change User's status to Activate/Deactivate.|
|DELETE|`/api/admin/user/:userId`|Delete a User from application database.|
|DELETE|`/api/admin/user/:userId/reset`|Reset a User's details.|

---

## 🧹 Graceful Shutdown

On **`Ctrl+C`** or stop signal:

Prisma disconnects cleanly.

Server closes connections gracefully.

Logs:

🛑 Shutting down gracefully...  
🧹 Prisma disconnected and server closed.

---

## 🧭 Future Enhancements

- Attribute Based Access Control (For Admin Login)

- Role-based access control (RBAC)

- AI-based mindmap generation

- Caching and performance optimization

- GraphQL API support

- Real time video lecture room.

- Calender Sync

- Voice Assistant Support

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgements
Thanks to all the open-source community! and all the contributors in this repo.

---

## 💬 Author
- Snehasish Das
> Developer • Cyber Security Enthusiast • NeuroViz Project Member

## 💬 Collaborators
- Rounak Saha
> Backend Developer • Cyber Security Enthusiast • NeuroViz Project Lead

- Puskar Sarkar
> App Developer and Tester • Cyber Security Enthusiast • NeuroViz Project Member

- Sagnika Mitra
> Frontend Web-Developer • Cyber Security Enthusiast • NeuroViz Project Member

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