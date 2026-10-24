
import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";
import "../AuthPages.css";

export default function Login({ onNavigate, onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    // Backend authentication will be connected here later.
    if (onSubmit) {
      onSubmit({ email: email.trim(), password });
    } else {
      setError("Login is not connected yet. We'll connect it to the backend soon.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="auth-logo">
            <ShieldCheck size={27} />
          </div>
          <span>BrandGuard</span>
        </div>

        <div className="auth-brand-message">
          <span className="auth-eyebrow">YOUR BRAND. YOUR RULES.</span>
          <h1>Every word should protect your brand.</h1>
          <p>
            Review content, maintain consistent brand guidelines,
            and create messaging you can trust.
          </p>
          <div className="auth-feature">
            <ShieldCheck size={19} />
            <span>Keep every message on-brand.</span>
          </div>
        </div>

        <p className="auth-panel-footer">
          Thoughtful content. Consistent branding.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo">
            <ShieldCheck size={25} />
            <span>BrandGuard</span>
          </div>

          <div className="auth-heading">
            <span className="auth-eyebrow">WELCOME BACK</span>
            <h2>Sign in to BrandGuard</h2>
            <p>Enter your details to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="auth-label-row">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="auth-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-submit">
              Sign in <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button type="button" onClick={() => onNavigate("signup")}>
              Create an account
            </button>
          </p>

          <p className="auth-legal">
            By continuing, you agree to use BrandGuard responsibly.
          </p>
        </div>
      </section>
    </main>
  );
}
