import React from 'react'
import AppRoute from './Routes/AppRoute'
import { UserProvider } from './Context/user.context'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <div>
      <UserProvider>
        <AppRoute/>
      </UserProvider>
      <ToastContainer />

    </div>
  )
}

export default App
