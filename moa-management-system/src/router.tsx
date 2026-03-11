import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Signin from "./components/Signin";
import Signup from "./components/Signup"; 
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import RoleGuard from "./components/RoleGuard";

// Ensure there are NO "const Signup = ..." or "const Signin = ..." 
// lines below your imports.

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, 
    children: [
      { index: true, element: <Navigate to="/signin" replace /> },
      { path: "signin", element: <Signin /> },
      { path: "signup", element: <Signup /> },
      {
        path: "dashboard",
        element: (
          <RoleGuard allowedRoles={["student", "staff", "admin"]}>
            <UserDashboard />
          </RoleGuard>
        ),
      },
      {
        path: "admin-dashboard",
        element: (
          <RoleGuard allowedRoles={["admin"]}>
            <AdminDashboard />
          </RoleGuard>
        ),
      },
      { path: "*", element: <Navigate to="/signin" replace /> },
    ],
  },
]);