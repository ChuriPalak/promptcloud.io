import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Architecture from "./components/Architecture";
import Features from "./components/Features";
import ChatDemo from "./components/ChatDemo";
import Billing from "./components/Billing";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="w-full min-w-full opacity-100">
      <Navbar />
      <Hero />
      <Architecture />
      <Features />
      <ChatDemo />
      <Billing />
      <Pricing />
      <Footer />
    </main>
  );
}
