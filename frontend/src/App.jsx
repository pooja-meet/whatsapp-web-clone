import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Chat from './component/Chat/Chat'
import Login from './component/auth/Auth'
import Register from './component/auth/Auth'
import Protected from './component/protected/Protected'
import './app.css'
export default function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <>
        <Protected>
          <Chat />
        </Protected>
      </>
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/register',
      element: <Register />
    }

  ])
  return (
    <RouterProvider router={router} />
  )
}
