import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Activity, Bell, LogOut, Menu, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/Button";
import Footer from "@/components/Footer";
import HealthChatbot from "@/components/HealthChatbot";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";
import { clearHospitalRole } from "@/lib/hospitalRole";
import {
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_UPDATED_EVENT,
  readNotifications,
  type AppNotification,
} from "@/lib/notifications";

interface AppLayoutProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  centerHeader?: boolean;
  hideHeader?: boolean;
  children: ReactNode;
}

const getInitials = (fullName?: string | null): string => {
  const normalized = fullName?.trim();
  if (!normalized) return "U";

  const nameParts = normalized.split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }

  return `${nameParts[0][0] ?? ""}${nameParts[nameParts.length - 1][0] ?? ""}`.toUpperCase();
};

const formatNotificationTime = (isoDate: string): string => {
  const created = new Date(isoDate).getTime();
  if (!Number.isFinite(created)) return "now";
  const minutes = Math.max(1, Math.floor((Date.now() - created) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const AppLayout = ({ title, subtitle, centerHeader = false, hideHeader = false, children }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const isHospitalRoute = location.pathname.startsWith("/hospital");
  const isSettingsPage = location.pathname === "/settings" || location.pathname === "/hospital/settings";
  const isHealthPage = location.pathname === "/health";
  const isMobileSearchVisible = isHealthPage;
  const userInitials = useMemo(() => getInitials(user?.full_name), [user?.full_name]);
  const unreadNotificationCount = useMemo(
    () => notifications.reduce((count, item) => (item.read ? count : count + 1), 0),
    [notifications],
  );

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const searchPlaceholders: Record<string, string> = {
    "/dashboard": "Search your daily health snapshot...",
    "/health": "Search symptoms, vitals, and trends...",
    "/aqi": "Search air quality history...",
    "/analysis": "Search analysis insights...",
    "/community": "Search community posts...",
    "/pricing": "Search plans and subscriptions...",
    "/profile": "Search profile details...",
    "/settings": "Search account settings...",
    "/hospital/admin": "Search admin operations...",
    "/hospital/doctor": "Search appointments and rounds...",
    "/hospital/nurse": "Search nurse duties and rounds...",
    "/hospital/staff-account": "Search staff operations...",
    "/hospital/dashboard": "Search hospital analytics...",
    "/hospital/doctors": "Search doctors and duty roster...",
    "/hospital/staff": "Search staff tasks...",
    "/hospital/resources": "Search resources and beds...",
    "/hospital/emergency": "Search emergency alerts...",
    "/hospital/profile": "Search hospital profile...",
    "/hospital/settings": "Search hospital settings...",
  };
  const searchPlaceholder =
    searchPlaceholders[location.pathname] ?? (isHospitalRoute ? "Search hospital data..." : "Search health data...");

  useEffect(() => {
    setUserMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setNotificationMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setNotifications(readNotifications());

    const refreshNotifications = () => setNotifications(readNotifications());

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications as EventListener);
    window.addEventListener("storage", refreshNotifications);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications as EventListener);
      window.removeEventListener("storage", refreshNotifications);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setUserMenuOpen(false);
    setIsLoggingOut(true);

    try {
      clearHospitalRole();
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    const browserFind = (window as Window & { find?: (...args: unknown[]) => boolean }).find;
    if (typeof browserFind === "function") {
      browserFind(query, false, false, true, false, false, false);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    setNotifications(readNotifications());
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-[15.4rem] border-r border-border/60 bg-card/80 shadow-[0_0_0_1px_hsl(var(--border)/0.3),0_20px_38px_-28px_hsl(217_34%_12%/0.35)] backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="relative h-full w-[18rem] border-r border-border/60 bg-card shadow-2xl"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border-b border-border/60 p-3">
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="h-[calc(100%-3.25rem)] p-3">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[15.4rem]">
        <header className="sticky top-0 z-20 border-b border-border/50 bg-card/85 backdrop-blur-2xl transition-all duration-300">
          <motion.div className="absolute top-0 left-0 right-0 h-[2px] bg-primary origin-left z-50" style={{ scaleX }} />
          <div className="relative flex h-16 items-center gap-3 px-4 pt-[2px] lg:px-6">
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            {!isMobileSearchVisible ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 lg:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Activity className="h-4.5 w-4.5 text-primary-foreground" />
                </span>
                <span className="font-display text-lg font-bold leading-none text-foreground">CuraSync</span>
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 items-center">
              <div className={cn("relative w-full max-w-md", !isMobileSearchVisible && "hidden lg:block", isMobileSearchVisible && "max-w-full")}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-xl border border-border/60 bg-muted/55 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle compact />

              {isSettingsPage ? null : (
                <>
                  <div className="relative" ref={notificationMenuRef}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative h-10 w-10 rounded-xl"
                      onClick={() => setNotificationMenuOpen((prev) => !prev)}
                    >
                      <Bell className="h-4 w-4" />
                      {unreadNotificationCount ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-health-rose px-1 text-[10px] font-bold text-white">
                          {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                        </span>
                      ) : null}
                    </Button>
                    <AnimatePresence>
                      {notificationMenuOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-11 z-30 w-[19rem] rounded-xl border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur-xl"
                        >
                          <div className="mb-2 flex items-center justify-between px-1 py-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
                            <Button type="button" variant="ghost" className="h-7 rounded-md px-2 text-[11px]" onClick={handleMarkAllRead}>
                              Mark all read
                            </Button>
                          </div>
                          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                            {notifications.length ? (
                              notifications.slice(0, 8).map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={cn(
                                    "w-full rounded-lg border px-3 py-2 text-left transition hover:border-primary/40",
                                    item.read ? "border-border/45 bg-card/65" : "border-primary/30 bg-primary/10",
                                  )}
                                  onClick={() => {
                                    if (!item.read) {
                                      markNotificationRead(item.id);
                                      setNotifications(readNotifications());
                                    }
                                  }}
                                >
                                  <p className="text-xs font-semibold">{item.title}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">{formatNotificationTime(item.createdAt)}</p>
                                </button>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/70 bg-card/50 px-3 py-4 text-xs text-muted-foreground">
                                No notifications yet.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-1 ring-primary/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                      onClick={() => setUserMenuOpen((prev) => !prev)}
                      title={user?.full_name || "User"}
                    >
                      {userInitials}
                    </button>
                    <AnimatePresence>
                      {userMenuOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-11 z-30 w-36 rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-lg backdrop-blur-xl"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 w-full justify-start rounded-lg text-sm"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                          >
                            <LogOut className="h-4 w-4" />
                            {isLoggingOut ? "Logging out..." : "Log Out"}
                          </Button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-8 lg:p-6 lg:pb-10">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {!hideHeader && title ? (
              <section className={cn("mb-6", centerHeader && "text-center")}>
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{title}</h1>
                {subtitle ? <p className="mt-1.5 hidden text-base text-muted-foreground sm:block">{subtitle}</p> : null}
              </section>
            ) : null}
            <div className="space-y-6">{children}</div>
          </motion.div>
        </main>
        <HealthChatbot />
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;
