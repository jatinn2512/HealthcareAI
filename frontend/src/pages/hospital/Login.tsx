import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, Eye, EyeOff, Lock, Mail, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";

const heroImg = "/assets/hero-health-ai.png";
const defaultHospitalEmail = "hospital@gmail.com";
const defaultHospitalPassword = "123456";

type LoginPortal = "hospital" | "patient";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();

  const [selectedPortal, setSelectedPortal] = useState<LoginPortal>("hospital");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState(defaultHospitalEmail);
  const [password, setPassword] = useState(defaultHospitalPassword);
  const [errorMessage, setErrorMessage] = useState("");

  const { redirectTo, shouldAutoRedirect } = useMemo(() => {
    const state = location.state as { from?: string } | null;
    const requestedPath = state?.from?.trim();
    const isProtectedReturn = Boolean(requestedPath) && requestedPath !== "/hospital/login";
    if (!requestedPath || requestedPath === "/hospital/login") {
      return { redirectTo: "/hospital/doctors", shouldAutoRedirect: false };
    }
    return { redirectTo: requestedPath, shouldAutoRedirect: isProtectedReturn };
  }, [location.state]);

  useEffect(() => {
    if (user && !authLoading && shouldAutoRedirect) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, navigate, redirectTo, shouldAutoRedirect, user]);

  const onLogin = async () => {
    if (isSigningIn || authLoading) return;
    if (selectedPortal !== "hospital") {
      navigate("/login");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }
    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Invalid email. Email must contain @.");
      return;
    }

    setErrorMessage("");
    setIsSigningIn(true);

    try {
      await login(normalizedEmail, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const resolvedError = error instanceof Error ? error.message : "Invalid email or password.";
      setErrorMessage(resolvedError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const onQuickDoctorLogin = async () => {
    if (isSigningIn || authLoading) return;

    setSelectedPortal("hospital");
    setEmail(defaultHospitalEmail);
    setPassword(defaultHospitalPassword);
    setErrorMessage("");
    setIsSigningIn(true);

    try {
      await login(defaultHospitalEmail, defaultHospitalPassword);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const resolvedError = error instanceof Error ? error.message : "Invalid email or password.";
      setErrorMessage(resolvedError);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !isSigningIn && !authLoading) {
      void onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-start gap-10 lg:items-center lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="mx-auto max-w-md lg:max-w-lg">
            <img src={heroImg} alt="CuraSync hospital console" className="mx-auto w-full max-w-[380px]" />
            <h1 className="mt-6 text-3xl font-bold leading-tight text-foreground sm:text-4xl">Doctor & Hospital Login</h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Access the hospital command center to monitor analytics, resources, staffing, and emergency alerts.
            </p>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-[560px] rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_22px_55px_-34px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  className="mb-3 inline-flex items-center gap-2 text-left text-3xl font-bold leading-none text-foreground sm:text-[38px]"
                  onClick={() => navigate("/")}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700">
                    <Activity className="h-6 w-6 text-white" />
                  </span>
                  CuraSync
                </button>
                <h2 className="text-4xl font-bold leading-none text-foreground sm:text-[46px]">Sign In</h2>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full border border-border bg-muted text-muted-foreground hover:bg-muted/80"
                onClick={() => navigate("/")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  selectedPortal === "hospital"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/40"
                }`}
                onClick={() => setSelectedPortal("hospital")}
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Building2 className="h-4 w-4" />
                  Hospital Administration
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Active login portal</p>
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  selectedPortal === "patient"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/40"
                }`}
                onClick={() => {
                  setSelectedPortal("patient");
                  navigate("/login");
                }}
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="h-4 w-4" />
                  Patient / Person
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Use patient portal</p>
              </button>
            </div>

            <div className="space-y-4">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errorMessage}</div>
              ) : null}

              <div className="rounded-xl border border-border/60 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                Need patient access? Open the patient portal from the button above or visit <span className="font-semibold">/login</span>.
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                Demo hospital credentials: <span className="font-semibold">{defaultHospitalEmail}</span> /{" "}
                <span className="font-semibold">{defaultHospitalPassword}</span>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
                  Email
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
                  Password
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                className="h-12 w-full rounded-full border-0 bg-emerald-700 text-lg font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={() => void onLogin()}
                disabled={isSigningIn || authLoading}
              >
                {isSigningIn || authLoading ? "Signing in..." : "Hospital Sign In"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full border-emerald-700/50 text-sm font-semibold text-foreground"
                onClick={() => void onQuickDoctorLogin()}
                disabled={isSigningIn || authLoading}
              >
                Instant Doctor Login
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
