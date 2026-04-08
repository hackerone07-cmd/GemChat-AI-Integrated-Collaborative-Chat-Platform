import React from "react";
import AppRoute from "./Routes/AppRoute";
import { UserProvider } from "./Context/user.context";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const App = () => (
  <UserProvider>
    <AppRoute />
    <ToastContainer
      position="top-center"
      autoClose={2500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme="dark"
    />
   
  </UserProvider>
);

export default App;