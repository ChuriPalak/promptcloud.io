"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../components/Logo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    company_name: "",
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await res.json();

      if (data.ok) {
        setStep(2);
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP + Create Account
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          otp,
          name: form.name,
          password: form.password,
          phone: form.phone || null,
          company_name: form.company_name || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("promptcloud_token", data.token);
        localStorage.setItem("promptcloud_user", JSON.stringify(data.user));
        setStep(3);
        // Auto-redirect after 2s
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/register-send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (data.ok) {
        setError("");
        alert("New OTP sent!");
      } else {
        setError(data.error || "Failed to resend OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center px-4 overflow-hidden"
      style={{ background: "#0a0618" }}
    >
      {/* Purple glow — top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-20%",
          left: "-15%",
          width: "900px",
          height: "900px",
          background: "radial-gradient(ellipse at 15% 25%, #5b1fa8 0%, #2a0a6e 35%, transparent 65%)",
          filter: "blur(60px)",
          opacity: 0.9,
        }}
      />
      {/* Secondary orb — bottom-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "-10%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(ellipse at 85% 80%, #3b0f8a 0%, transparent 50%)",
          filter: "blur(50px)",
          opacity: 0.6,
        }}
      />
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative z-10 w-full" style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <Logo variant="auth" />
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              padding: "3px 12px",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: step === 3 ? "#4ade80" : "#fbbf24",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
              {step === 1 && "Create your account"}
              {step === 2 && "Verify your email"}
              {step === 3 && "Account Created"}
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.055)",
            backdropFilter: "blur(40px) saturate(140%)",
            WebkitBackdropFilter: "blur(40px) saturate(140%)",
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: "24px",
            padding: "2.25rem 2rem 2rem",
          }}
        >
          {/* Top shine line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)" }}
          />

          <div className="relative z-10">
            {error && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "12px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            {/* ── STEP 1: Registration Form ── */}
            {step === 1 && (
              <>
                <p style={{ fontSize: "19px", fontWeight: 500, color: "#fff", margin: "0 0 3px" }}>Register</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.32)", margin: "0 0 1.5rem" }}>
                  Fill in your details to get started
                </p>

                <form onSubmit={handleSendOTP}>
                  {/* Name + Email */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: "6px",
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        Full Name *
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          height: "46px",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          required
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13.5px", color: "#fff", width: "100%" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: "6px",
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        Email *
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          height: "46px",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@company.com"
                          required
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13.5px", color: "#fff", width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password + Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: "6px",
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        Password *
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          height: "46px",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Min 8 characters"
                          required
                          minLength={8}
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13.5px", color: "#fff", width: "100%" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.3)", display: "flex", flexShrink: 0 }}
                          aria-label="Toggle password"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: "6px",
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        Phone *
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          height: "46px",
                          transition: "all 0.2s",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          required
                          style={{ border: "none", background: "transparent", outline: "none", fontSize: "13.5px", color: "#fff", width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.35)",
                        marginBottom: "6px",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                      }}
                    >
                      Company Name{" "}
                      <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(optional)</span>
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        padding: "0 14px",
                        height: "46px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        width: "100%",
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <input
                        type="text"
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                        placeholder="Acme Inc."
                        style={{ border: "none", background: "transparent", outline: "none", fontSize: "13.5px", color: "#fff", width: "100%" }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: "48px",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "#fff",
                      cursor: loading ? "not-allowed" : "pointer",
                      position: "relative",
                      overflow: "hidden",
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      marginTop: "1.5rem",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", borderRadius: "12px 12px 0 0", background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ position: "relative", zIndex: 1 }}>
                      {loading ? "Sending OTP..." : "Continue"}
                    </span>
                  </button>
                </form>

                <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.3)", margin: "1.1rem 0 0" }}>
                  Already have an account?{" "}
                  <Link href="/login" style={{ color: "#a78bfa", cursor: "pointer", fontWeight: 500, textDecoration: "none" }}>
                    Sign In
                  </Link>
                </p>
              </>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {step === 2 && (
              <>
                <p style={{ fontSize: "19px", fontWeight: 500, color: "#fff", margin: "0 0 3px" }}>Verify Email</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.32)", margin: "0 0 1.5rem" }}>
                  Enter the 6-digit code sent to <b style={{ color: "rgba(255,255,255,0.6)" }}>{form.email}</b>
                </p>

                <form onSubmit={handleVerifyOTP}>
                  <div style={{ display: "flex", flexDirection: "column", marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.35)",
                        marginBottom: "6px",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                      }}
                    >
                      OTP Code *
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        padding: "0 14px",
                        height: "46px",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        width: "100%",
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        required
                        style={{
                          border: "none",
                          background: "transparent",
                          outline: "none",
                          fontSize: "16px",
                          color: "#fff",
                          width: "100%",
                          letterSpacing: "0.3em",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: "48px",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "#fff",
                      cursor: loading ? "not-allowed" : "pointer",
                      position: "relative",
                      overflow: "hidden",
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      marginTop: "0.5rem",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", borderRadius: "12px 12px 0 0", background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ position: "relative", zIndex: 1 }}>
                      {loading ? "Verifying..." : "Verify & Create Account"}
                    </span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "13px" }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={resendOTP}
                      disabled={loading}
                      style={{ background: "none", border: "none", color: "#a78bfa", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px" }}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(74,222,128,0.15)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#4ade80" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p style={{ fontSize: "19px", fontWeight: 500, color: "#fff", margin: "0 0 8px" }}>Account Created!</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.32)", margin: "0 0 1.5rem" }}>
                  Welcome to PromptCloud. Redirecting to your dashboard...
                </p>
                <div
                  style={{
                    width: "100%",
                    height: "4px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                      borderRadius: "2px",
                      animation: "progressShrink 2s linear forwards",
                    }}
                  />
                </div>
                <style>{`
                  @keyframes progressShrink {
                    from { width: 100%; }
                    to { width: 0%; }
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.2)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>256-bit TLS</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.2)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>SOC 2 Type II</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "rgba(255,255,255,0.2)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>99.9% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
