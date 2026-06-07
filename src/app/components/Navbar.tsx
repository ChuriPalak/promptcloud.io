"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[rgba(224,170,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo variant="nav" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">Features</a>
            <a href="#demo" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">Demo</a>
            <a href="#billing" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">Billing</a>
            <a href="#pricing" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">Pricing</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="btn-secondary text-sm" style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '6px 16px', borderRadius: '8px' }}>Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-white/5"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-[rgba(224,170,255,0.1)]">
            <a href="#features" className="block text-sm text-[#a0a0c0] hover:text-[#e0aaff] py-2">Features</a>
            <a href="#demo" className="block text-sm text-[#a0a0c0] hover:text-[#e0aaff] py-2">Demo</a>
            <a href="#billing" className="block text-sm text-[#a0a0c0] hover:text-[#e0aaff] py-2">Billing</a>
            <a href="#pricing" className="block text-sm text-[#a0a0c0] hover:text-[#e0aaff] py-2">Pricing</a>
            <div className="flex gap-3 pt-3">
              <Link href="/login" className="btn-secondary text-sm flex-1 text-center">Sign In</Link>
              <Link href="/register" className="btn-primary text-sm flex-1 text-center">Get Started</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
