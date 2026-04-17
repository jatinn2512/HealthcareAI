import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-bg-hero px-4">
      <div className="absolute left-6 top-14 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-10 right-6 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle compact />
      </div>

      <div className="relative z-10 w-full max-w-xl rounded-3xl p-8 text-center glass-card sm:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg-primary">
          <AlertTriangle className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-3 text-xl font-medium">Page not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The route <span className="font-medium">{location.pathname}</span> does not exist.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            className="gap-2 border-0 gradient-bg-primary text-primary-foreground"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
