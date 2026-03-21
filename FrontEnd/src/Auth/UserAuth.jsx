import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../Context/user.context";

const UserAuth = ({ children }) => {
  const { user } = useContext(UserContext);
  const token = localStorage.getItem("token");

  // If no token and no user in context → redirect to login
  if (!token && !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default UserAuth;