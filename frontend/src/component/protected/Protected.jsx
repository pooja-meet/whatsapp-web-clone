
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

export default function Protected({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (cancelled) return;

        setAuthenticated(
          res.ok && data.authenticated === true
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Session check failed:", error);
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
