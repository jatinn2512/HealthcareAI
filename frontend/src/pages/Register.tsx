import { useEffect, useState } from "react";
import { Activity, Eye, EyeOff, Lock, Mail, UserRound, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";

const heroImg = "/assets/hero-health-ai.png";

const Register = () => {
  const navigate = useNavigate();
  const { register, user, isLoading: authLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const onCreateAccount = async () => {
    if (isCreating || authLoading) return;

    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setErrorMessage("All fields are required.");
      return;
    }
    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Invalid email. Email must contain @.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Password and confirm password must match.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setErrorMessage("");
    setIsCreating(true);

    try {
      await register({
        full_name: trimmedName,
        email: normalizedEmail,
        password,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Registration failed. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating && !authLoading) {
      onCreateAccount();
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground md:px-8 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-start gap-6 lg:items-center lg:grid-cols-2 lg:gap-10">
        <section className="hidden lg:block">
          <div className="mx-auto max-w-md lg:max-w-lg">
            <img src={heroImg} alt="CuraSync assistant" className="mx-auto w-full max-w-[380px]" />
            <h1 className="mt-6 text-3xl font-bold leading-tight text-foreground sm:text-4xl">Create your account.</h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Join CuraSync to track your health, routines and progress in one workspace.
            </p>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-[560px] rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-[0_22px_55px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
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
                <h2 className="text-4xl font-bold leading-none text-foreground sm:text-[42px]">Create Account</h2>
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

            <div className="space-y-4">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-foreground">
                  Full Name
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your Name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">
                  Email
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground">
                  Password
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-foreground">
                  Confirm Password
                </label>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    className="text-muted-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                className="h-12 w-full rounded-full border-0 bg-emerald-700 text-lg font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={onCreateAccount}
                disabled={isCreating || authLoading}
              >
                {isCreating || authLoading ? "Creating account..." : "Create Account"}
              </Button>

              <Button
                type="button"
                onClick={() => {}}
                aria-disabled="true"
                className="h-12 w-full rounded-full border border-emerald-700 bg-card text-lg font-semibold text-foreground hover:bg-muted/30"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.65z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3a7.2 7.2 0 0 1-10.73-3.78H1.34v3.08A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.34 14.32a7.2 7.2 0 0 1 0-4.58V6.66H1.34a12 12 0 0 0 0 10.74l4-3.08z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.48 11.48 0 0 0 12 0 12 12 0 0 0 1.34 6.66l4 3.08A7.2 7.2 0 0 1 12 4.77z"
                  />
                </svg>
                Sign up with Google (Disabled)
              </Button>

              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Register;
