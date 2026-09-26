import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useAuth } from "./_core/hooks/useAuth";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user && location !== "/login") {
      setLocation("/login");
    }
  }, [loading, location, setLocation, user]);

  if (loading) {
    return (
      <div className="grain flex min-h-dvh items-center justify-center bg-[#f2ead8]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#cdbb9c] bg-[#f7f0e3] px-5 py-4 text-[#2f3e34]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="mono text-[10px] uppercase tracking-[.16em]">
            Restoring session
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/">
              <Protected>
                <Home />
              </Protected>
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
