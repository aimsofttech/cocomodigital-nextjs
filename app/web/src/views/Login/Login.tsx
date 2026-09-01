"use client";

/**
 * /login — a demo sign-in for the marketing site.
 *
 * DELIBERATELY NOT REAL AUTHENTICATION. The credentials are compared in the
 * browser against the constants below, so anyone can read them in the page
 * source. There is no API call, no token, no server-side session, and nothing
 * on this site is gated behind it — signing in only records a flag in this
 * browser's own storage.
 *
 * That is what was asked for: a demo login with fixed credentials, no backend.
 * Treat it as a prototype of the screen, not as a way to protect anything. Real
 * admin authentication lives at /admin, against the API.
 *
 * Every class here already exists in globals.css from the original login form,
 * so this introduces no new styling.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/src/lib/navigation";
import {
  checkDemoCredentials,
  signInDemo,
  signOutDemo,
  useDemoSession,
} from "@/src/lib/demoAuth";

const Login = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /* Null on the first paint so the server and client renders agree; the stored
     value arrives a tick later. The header reads the very same hook, so signing
     in or out here updates it without a reload. */
  const signedInAs = useDemoSession();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);

      if (!checkDemoCredentials(email, password)) {
        /* One message for both fields: saying which half was wrong tells an
           attacker which addresses exist, and is no help to a real user. */
        setError("Incorrect email or password.");
        setSubmitting(false);
        return;
      }

      signInDemo(email);
      router.push("/");
    },
    [email, password, router],
  );

  const handleSignOut = () => {
    signOutDemo();
    setEmail("");
    setPassword("");
    setError(null);
  };

  if (signedInAs) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2 className="login-title">You’re signed in</h2>
          <p style={{ margin: "0 0 20px", color: "#555", fontSize: 15 }}>
            Signed in as <strong style={{ color: "#111" }}>{signedInAs}</strong>.
          </p>
          <div className="login-form">
            <Link
              to="/"
              className="login-button"
              style={{ textDecoration: "none", display: "block", textAlign: "center" }}
            >
              Continue to the site
            </Link>
            <button type="button" onClick={handleSignOut} className="login-input" style={{ cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Sign in</h2>

        <form className="login-form" onSubmit={handleSubmit} noValidate={false}>
          <input
            className="login-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email"
            aria-label="Email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
          />
          <input
            className="login-input"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
          />

          {error && (
            <p
              role="alert"
              style={{ margin: 0, color: "#c0392b", fontSize: 14, textAlign: "left" }}
            >
              {error}
            </p>
          )}

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          Editing the website? The admin panel is at <Link to="/admin">/admin</Link>.
        </p>
      </div>
    </div>
  );
};

export default Login;
