import { MoonStar, Sun } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import useTheme from "@/hooks/useTheme";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

const ThemeToggle = ({ className, compact = false, showLabel = false }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "default"}
      className={cn(
        "border border-border/55 bg-card/70 hover:bg-muted/60",
        compact ? "h-9 w-9 rounded-xl" : "h-10 rounded-xl px-3.5",
        className,
      )}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="h-[18px] w-[18px] text-health-cyan" /> : <MoonStar className="h-[18px] w-[18px] text-health-indigo" />}
      {showLabel && <span className="text-xs font-semibold">{isDark ? "Light" : "Dark"} mode</span>}
    </Button>
  );
};

export default ThemeToggle;
