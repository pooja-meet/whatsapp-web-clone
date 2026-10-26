import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

export default function Protected({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/auth/me`, {
          withCredentials: true,
        });

        if (cancelled) return;

        // Authentication successful
        setAuthenticated(res.data.authenticated === true);
      } catch (error) {
        if (!cancelled) {
          setAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p>Checking login...</p>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
