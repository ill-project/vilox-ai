import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Brain, Globe, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Markets", path: "/markets" },
    { name: "AI Trading", path: "/ai-trading" },
    { name: "Security", path: "/security" },
    { name: "Pricing", path: "/pricing" },
    { name: "About", path: "/about" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-[#4F7CFF]/30 overflow-x-hidden flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F1A]/80 backdrop-blur-md border-b border-[#1F2937]/50">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F7CFF] to-[#6C3BFF] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Vilox <span className="text-[#4F7CFF]">AI</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="transition-colors hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 md:gap-6 text-sm font-medium">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-[#1F2937]">
              <span className="text-xs text-[#9CA3AF]">AI Engine:</span>
              <span className="flex items-center gap-1 text-xs text-[#00FFA3] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse"></span>
                Active
              </span>
            </div>

            <Link to="/sign-in" className="text-[#9CA3AF] hover:text-white transition-colors hidden sm:block">Sign In</Link>
            <Link to="/get-started" className="bg-[#4F7CFF] hover:bg-[#4F7CFF]/90 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm shadow-[0_0_15px_rgba(79,124,255,0.4)] transition-all hover:shadow-[0_0_25px_rgba(79,124,255,0.6)]">
              Start Investing
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[#1F2937]/50 bg-[#0B0F1A]/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      location.pathname === link.path
                        ? "bg-[#4F7CFF]/10 text-[#4F7CFF] border border-[#4F7CFF]/20"
                        : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="border-t border-[#1F2937]/50 mt-2 pt-2">
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0B0F1A] border-t border-[#1F2937] pt-20 pb-10 px-6 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F7CFF] to-[#6C3BFF] flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Vilox <span className="text-[#4F7CFF]">AI</span></span>
            </div>
            <p className="text-[#9CA3AF] max-w-xs leading-relaxed">
              AI assisted trading platform empowering individuals to invest globally with confidence.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-white">Company</h4>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><Link to="/about" className="hover:text-[#4F7CFF] transition-colors">About</Link></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-white">Platform</h4>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><Link to="/markets" className="hover:text-[#4F7CFF] transition-colors">Markets</Link></li>
              <li><Link to="/ai-trading" className="hover:text-[#4F7CFF] transition-colors">AI Trading</Link></li>
              <li><Link to="/security" className="hover:text-[#4F7CFF] transition-colors">Security</Link></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6 text-white">Legal</h4>
            <ul className="space-y-4 text-sm text-[#9CA3AF]">
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#4F7CFF] transition-colors">Risk Disclosure</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-[#1F2937] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#9CA3AF]">
          <p>Vilox AI © 2026. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Globe className="w-4 h-4" />
            <span>English (US)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
