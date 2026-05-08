frontend/
│
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Sessions.jsx
│   │   ├── Rules.jsx
│   │   └── Logs.jsx
│
│   ├── components/
│   │   ├── SessionCard.jsx
│   │   ├── QRModal.jsx
│   │   ├── RuleForm.jsx
│   │   └── Table.jsx
│
│   ├── services/
│   │   └── api.js
│
│   ├── hooks/
│   └── context/

########################################
backend/
│
├── src/
│
│   ├── server.js
│   ├── app.js
│
│   ├── config/
│   │   ├── env.js
│   │   └── db.js
│
│   ├── modules/
│   │
│   │   ├── sessions/
│   │   │   ├── session.controller.js
│   │   │   ├── session.service.js
│   │   │   ├── session.store.js
│   │   │   └── session.socket.js
│   │
│   │   ├── rules/
│   │   │   ├── rules.controller.js
│   │   │   ├── rules.service.js
│   │   │   └── rules.engine.js
│   │
│   │   ├── messages/
│   │   │   ├── message.listener.js
│   │   │   └── message.service.js
│   │
│   │   └── auth/
│
│   ├── infra/
│   │
│   │   ├── baileys/
│   │   │   ├── baileys.client.js
│   │   │   └── baileys.manager.js
│   │
│   │   ├── websocket/
│   │   └── db/
│
│   ├── routes/
│   │   ├── sessions.routes.js
│   │   ├── rules.routes.js
│   │   └── messages.routes.js
│
│   └── utils/