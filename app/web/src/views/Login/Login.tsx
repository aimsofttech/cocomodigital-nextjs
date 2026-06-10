// @ts-nocheck
"use client";

/**
 * /login — DEPRECATED in Phase 5b.
 *
 * The legacy marketing-site login flow (hardcoded
 * admin@cocoma.com / 123456 against Redux state.me) is removed.
 * Admin authentication now lives at /admin (the API).
 *
 * Renders a redirect notice so any bookmarks land on the right
 * place. Will be deleted entirely in a follow-up cleanup once we
 * confirm no internal links still point to /login.
 */
import { Link } from "@/src/lib/navigation";

const Login = () => (
  <div className="login-container">
    <div className="login-box">
      <h2 className="login-title">Admin login moved</h2>
      <p style={{ margin: "16px 0", color: "#555", fontSize: 15 }}>
        Cocoma's admin now lives at{" "}
        <Link
          to="/admin"
          style={{ color: "#111", fontWeight: 700, textDecoration: "underline" }}
        >
          /admin
        </Link>{" "}
        — log in there to edit content. The legacy login at this URL
        is no longer in use.
      </p>
    </div>
  </div>
);

export default Login;
