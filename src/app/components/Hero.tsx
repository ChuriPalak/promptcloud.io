"use client";

import { useEffect, useRef } from "react";

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const particleCount = 80;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(123, 44, 191, ${p.alpha})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(123, 44, 191, ${0.15 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section className="relative w-full min-w-full flex items-center justify-center overflow-hidden pt-16"
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
          zIndex: 0,
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
          zIndex: 0,
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          zIndex: 0,
        }}
      />

      {/* Animated Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 w-full h-full"
        style={{ background: "transparent" }}
      />

      {/* Gradient Overlays */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7b2cbf]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#e0aaff]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-float">
          <span className="w-2 h-2 rounded-full bg-[#2ed573] animate-pulse" />
          <span className="text-sm text-[#e0aaff]">Proxmox VE Native</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
        >
          <span className="block text-[#f0f0ff]">Proxmox Cloud</span>
          <span className="block gradient-text mt-2">Just Message Away</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#a0a0c0] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Deploy Proxmox VMs, LXC containers, and Kubernetes clusters — all through WhatsApp, Telegram, or Slack. 
          Natural language Proxmox management with <span className="text-[#e0aaff]">UPI + Crypto</span> billing.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button className="btn-primary text-lg px-8 py-4 w-full sm:w-auto"
          >
            Start Free Trial
          </button>
          <button className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: "< 5s", label: "VM Deploy" },
            { value: "99.9%", label: "Proxmox Uptime" },
            { value: "∞", label: "LXC Containers" },
            { value: "24/7", label: "AI Support" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold gradient-text mb-1"
              >{stat.value}</div>
              <div className="text-xs text-[#606080] uppercase tracking-wider"
              >{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce"
      >
        <svg className="w-6 h-6 text-[#a0a0c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
