import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { label: "Features", href: "#features", section: "features" },
  { label: "How It Works", href: "#how-it-works", section: "how-it-works" },
  { label: "Benefits", href: "#benefits", section: "benefits" },
  { label: "FAQs", href: "#faq", section: "faq" },
];

interface NavbarProps {
  onSectionClick: (section: string) => void;
}

const Navbar = ({ onSectionClick }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleSectionClick = (section: string) => {
    setMobileOpen(false);
    onSectionClick(section);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-card/60 backdrop-blur-2xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-border/80" />
      <div className="container flex h-[72px] items-center justify-between">
        <button
          type="button"
          className="group flex items-center gap-2.5 font-display text-[20px] font-bold leading-none"
          onClick={() => navigate("/")}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 glow-primary gradient-bg-primary">
            <Activity className="h-[22px] w-[22px] text-primary-foreground" />
          </div>
          <span>CuraSync</span>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-[16px] font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground"
              onClick={(event) => {
                event.preventDefault();
                handleSectionClick(link.section);
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle compact className="h-10 w-10 rounded-xl" />
          <Button variant="ghost" className="h-10 rounded-xl px-3.5 text-sm" onClick={() => navigate("/login")}>
            Patient Login
          </Button>
          <Button
            className="h-10 rounded-xl border-0 px-3.5 text-sm gradient-bg-primary text-primary-foreground"
            onClick={() => navigate("/doctor/login")}
          >
            Doctor Login
          </Button>
        </div>

        <button
          type="button"
          className="rounded-xl border border-border/55 bg-card/70 p-2 text-foreground md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/40 bg-card/90 backdrop-blur-2xl md:hidden"
          >
            <div className="container flex flex-col gap-3 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    handleSectionClick(link.section);
                  }}
                >
                  {link.label}
                </a>
              ))}
              <ThemeToggle className="w-full justify-start" showLabel />
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  className="h-10 flex-1 rounded-xl text-sm"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/login");
                  }}
                >
                  Patient Login
                </Button>
                <Button
                  className="h-10 flex-1 rounded-xl border-0 text-sm gradient-bg-primary text-primary-foreground"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate("/doctor/login");
                  }}
                >
                  Doctor Login
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
