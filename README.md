# TATA PWA Frontend

This is the frontend client for the PWA system, a Progressive Web Application built with React.js. It provides a responsive user interface for employees and managers to interact with the system.

## 🚀 Tech Stack

- **Framework:** [React](https://reactjs.org/) (Create React App)
- **Routing:** [React Router](https://reactrouter.com/)
- **Styling:** [Styled Components](https://styled-components.com/), [Bootstrap](https://getbootstrap.com/)
- **Date Handling:** `react-datepicker`
- **Notifications:** `react-toastify` (Toasters)
- **PWA Features:** Service Workers, Web Push Notifications
- **PWA Features:** Service Workers, Manifest

## 📂 Project Structure

```
tata_pwa_modified_frontend/
├── public/           # Static assets (index.html, manifest.json, icons)
├── src/
│   ├── components/   # Reusable UI components (Navbar, Popups, etc.)
│   ├── screens/      # Page components (Dashboard, Login, Profile, etc.)
│   ├── hooks/        # Custom React hooks
│   ├── utils/        # Utility functions
│   ├── App.js        # Main application component and routing
│   ├── config.js     # Configuration constants (e.g., API URLs)
│   └── index.js      # Entry point
└── package.json      # Dependencies and scripts
```

## 🛠️ Setup & Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd tata_pwa_modified_frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm start
    ```
    The app will run in development mode at `http://localhost:3000`.

## 📜 Scripts

- `npm start`: Runs the app in development mode.
- `npm run build`: Builds the app for production to the `build` folder.
- `npm test`: Launches the test runner.

## 📱 PWA Features & Notifications

- **Installable:** Includes `manifest.json` for home screen installation.
- **Push Notifications:** Supports real-time updates for:
    - New activity postings (Broadcast to ICs).
    - Login alerts (Security).
    - Profile and Password changes.
    - Enable this in the **Profile Screen**.

## 🛡️ Protected Routes

- **Authentication:** Routes are protected to ensure only logged-in users access the dashboard.
- **Role-Based Access:** Specific views (like Manager Dashboard) are restricted based on user roles (`Manager` vs `Employee`).
