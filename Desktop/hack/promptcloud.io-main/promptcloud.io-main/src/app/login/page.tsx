"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../components/Logo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: login, 2: otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("promptcloud_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.requires_otp) {
        const otpRes = await fetch(`${API_BASE}/api/auth/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email || email }),
        });
        const otpData = await otpRes.json();

        if (!otpRes.ok) {
          setError(otpData.error || "Could not send OTP.");
          return;
        }

        setStep(2);
      } else if (data.token) {
        localStorage.setItem("promptcloud_token", data.token);
        localStorage.setItem("promptcloud_user", JSON.stringify(data.user));
        if (rememberMe) {
          localStorage.setItem("promptcloud_remember", "true");
        }
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("promptcloud_token", data.token);
        localStorage.setItem("promptcloud_user", JSON.stringify(data.user));
        if (rememberMe) {
          localStorage.setItem("promptcloud_remember", "true");
        }
        router.push("/dashboard");
      } else {
        setError(data.error || "OTP verification failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center px-4 overflow-hidden"
      style={{ background: "#0a0618" }}
    >
      {/* Rich purple radial glow — top-left */}
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

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative z-10 w-full" style={{ maxWidth: "400px", margin: "0 auto" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo variant="auth" />
          </div>
          <div
            className="inline-flex items-center gap-2 mt-3 px-4 py-1.5"
            style={{
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: "12px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2ed573" }} />
            {step === 1 ? "Welcome Back" : "Verify OTP"}
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
            padding: "40px 36px",
          }}
        >
          {/* Top shine line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }}
          />

          {error && (
            <div
              className="mb-5 p-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleLogin}>
              {/* Heading */}
              <div className="mb-6">
                <h2 className="font-semibold" style={{ fontSize: "20px", color: "#fff" }}>Welcome back</h2>
                <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Sign in to manage your infrastructure</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full text-sm outline-none transition-all duration-200"
                    style={{
                      height: "48px",
                      paddingLeft: "40px",
                      paddingRight: "14px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(160,100,255,0.6)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(130,80,255,0.12)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full text-sm outline-none transition-all duration-200"
                    style={{
                      height: "48px",
                      paddingLeft: "40px",
                      paddingRight: "44px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(160,100,255,0.6)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(130,80,255,0.12)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.3)" }}
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

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="appearance-none cursor-pointer"
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: rememberMe ? "#7c3aed" : "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline transition-colors"
                  style={{ color: "#a78bfa" }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-sm transition-all duration-200 relative overflow-hidden mt-6"
                style={{
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.09)", borderRadius: "12px 12px 0 0" }}
                />
                <span className="relative z-10">{loading ? "Signing in..." : "Sign In"}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>or continue with</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200"
                  style={{
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.055)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200"
                  style={{
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.055)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                Enter the 6-digit code sent to your email
              </p>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full text-sm outline-none transition-all duration-200 text-center tracking-[0.5em]"
                  style={{
                    height: "48px",
                    paddingLeft: "40px",
                    paddingRight: "14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "18px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(160,100,255,0.6)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(130,80,255,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-sm transition-all duration-200 relative overflow-hidden mt-6"
                style={{
                  height: "48px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.09)", borderRadius: "12px 12px 0 0" }}
                />
                <span className="relative z-10">{loading ? "Verifying..." : "Verify & Continue"}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-3 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Back to Login
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {step === 1 ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/register" className="hover:underline transition-colors" style={{ color: "#a78bfa" }}>
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
          {[
            { icon: (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ), label: "256-bit TLS" },
            { icon: (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ), label: "SOC 2 Type II" },
            { icon: (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            ), label: "99.9% uptime" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
