
# **GemChat — AI-Integrated Collaborative Chat Platform**

GemChat is a full-stack, AI-powered collaborative chat platform designed for group-based study environments, technical discussions, and real-time problem solving. Users can chat with each other while interacting with Google Gemini inside the same conversation. The platform also includes an integrated browser-based code execution sandbox that lets users write, edit, and run AI-generated code snippets directly within the chat.

GemChat combines real-time communication, intelligent AI assistance, and executable code blocks to create a seamless collaborative experience for learners and developers.

---

## 🚀 **Features**

### ✅ **Real-Time Messaging**

* Instant messaging powered by WebSockets
* Typing indicators, message delivery status, and live chat updates
* Group chat rooms for study groups or team collaborations

### ✅ **AI Assistance via Google Gemini**

* Ask coding, study, or topic-specific questions directly in chat
* AI-generated explanations, summaries, and problem-solving help
* AI-assisted debugging and code snippet generation

### ✅ **Built-in Code Execution Engine**

* Write, edit, and run code inside chat
* Safe and sandboxed execution environment
* Supports multiple languages (depending on your implementation)
* AI-generated code can be executed immediately for testing

### ✅ **Collaboration Tools**

* Share code blocks, messages, and problem statements
* AI can analyze previous messages for context
* Students can collaborate on tasks in real time

### ✅ **User Management**

* Secure authentication
* User profiles
* Role-based access (Admin, Member, Guest)

---

## 🛠️ **Tech Stack**

### **Frontend**

* React / Next.js (or your actual frontend)
* WebSocket-based real-time messaging
* Integrated code editor (Monaco Editor / CodeMirror)
* Syntax highlighting
* Responsive UI

### **Backend**

* Node.js
* Express.js
* Socket.io for real-time communication
* Execution Sandbox (VM2 / Docker / isolated VM)
* Google Gemini API integration

### **Database**

* MongoDB
* Mongoose ORM

### **Other Tools**

* JWT / Sessions for authentication
* Cloud-based storage for logs or execution output
* GitHub for version control

---

## 🔧 **Installation & Setup**

### **1. Clone the repository**

```bash
git clone https://github.com/your-username/GemChat.git
cd GemChat
```

### **2. Install dependencies**

```bash
npm install
```

### **3. Create a `.env` file**

Add variables based on your backend architecture:

```
MONGO_URL=your_mongodb_connection
JWT_SECRET=your_secret
GEMINI_API_KEY=your_google_gemini_api_key
SANDBOX_SECRET=your_sandbox_key
```

### **4. Run the development server**

```bash
npm run dev
```

GemChat will run at:

```
http://localhost:3000/
```

---

## 📁 **Project Structure**

```
GemChat/
│── client/                # Frontend
│── server/                # Backend
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── socket/
│   ├── sandbox/
│── shared/
│── package.json
```

---

## ✅ **Core Components Explained**

### **💬 Real-Time Chat Engine**

* Built using Socket.io
* Handles rooms, user joins, disconnects
* Supports group collaboration

### **🤖 AI Assistant (Google Gemini)**

* Integrated directly in chat
* Uses context window from conversation history
* Helpful for code explanation, debugging, summaries, etc.

### **💻 Code Execution Sandbox**

* Secure environment to run user and AI-generated code
* Prevents unauthorized access and system-level commands
* Returns output, errors, logs back into the chat

### **👥 Collaboration & Group Features**

* Shared chat rooms
* AI assistance per-group
* Shared code snippets

---

## ✅ **Future Enhancements**

* Real-time collaborative code editing (Google Docs style)
* Voice-based AI assistance
* File uploads for AI summarization
* Multi-language code execution
* AI explanation mode for every code run

---

## 🤝 **Contributing**

Contributions are welcome!
Open an issue or submit a pull request.

---

## 📄 **License**


