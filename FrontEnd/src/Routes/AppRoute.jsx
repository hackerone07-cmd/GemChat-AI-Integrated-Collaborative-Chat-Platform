import React from "react";
import { Route, BrowserRouter, Routes, Navigate } from "react-router-dom";
import Landing  from "../Screens/Landing";
import Login    from "../Screens/Login";
import Register from "../Screens/Register";
import Home     from "../Screens/Home";
import Project  from "../Screens/Project";
import Profile  from "../Screens/Profile";
import UserAuth from "../Auth/UserAuth";

const AppRoute = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route path="/dashboard" element={<UserAuth><Home /></UserAuth>} />
      <Route path="/project"   element={<UserAuth><Project /></UserAuth>} />
      <Route path="/profile"   element={<UserAuth><Profile /></UserAuth>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoute;