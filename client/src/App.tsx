import { useState, useCallback, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { StartupScreen, STARTUP_SESSION_KEY } from "@/components/startup-screen";
import { VantaOSBoot } from "@/components/vanta-os-boot";
import { EnterVanta } from "@/components/enter-vanta";
import Home from "@/pages/home";
import PostPage from "@/pages/post";
import CreatePost from "@/pages/create";
import EditPost from "@/pages/edit";
import SearchPage from "@/pages/search";
import About from "@/pages/about";
import Music from "@/pages/music";
import Releases from "@/pages/releases";
import ReleasesNew from "@/pages/releases-new";
import ReleasesEdit from "@/pages/releases-edit";
import Worlds from "@/pages/worlds";
import Enter from "@/pages/enter";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin";
import AdminBlog from "@/pages/admin/blog";
import AdminReleases from "@/pages/admin/releases";
import AdminVault from "@/pages/admin/vault";
import AdminWorld from "@/pages/admin/world";
import AdminBlackIndex from "@/pages/admin/black-index";
import AdminUsers from "@/pages/admin/users";
import AdminDevLogs from "@/pages/admin/devlogs";
import AdminWaitlists from "@/pages/admin/waitlists";
import AdminApps from "@/pages/admin/apps";
import AdminSettings from "@/pages/admin/settings";
import Vault from "@/pages/vault";
import World from "@/pages/world";
import Wireline from "@/pages/wireline";
import Fract from "@/pages/fract";
import Himalayas from "@/pages/himalayas";
import FracturedGodhead from "@/pages/fgh";
import StonerismHome from "@/pages/stonerism/index";
import StonerismCannabis from "@/pages/stonerism/cannabis";
import StonerismPlaces from "@/pages/stonerism/places";
import StonerismBrands from "@/pages/stonerism/brands";
import StonerismMunchies from "@/pages/stonerism/munchies";
import StonerismWellness from "@/pages/stonerism/wellness";
import StonerismInnerLife from "@/pages/stonerism/inner-life";
import StonerismEvents from "@/pages/stonerism/events";
import StonerismJournal from "@/pages/stonerism/journal";
import StonerismArticle from "@/pages/stonerism/article";
import StonerismReview from "@/pages/stonerism/review";
import StonerismBusiness from "@/pages/stonerism/business";
import StonerismAdmin from "@/pages/stonerism-admin";
import Dashboard from "@/pages/dashboard";
import DevLogs from "@/pages/devlogs";
import DevLogDetail from "@/pages/devlogs-detail";
import EarlyAccess from "@/pages/early-access";
import EarlyAccessApp from "@/pages/early-access-app";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

// ── Paths that skip the full startup experience ────────────────────────────
const SKIP_STARTUP_PATHS = [
  "/world", "/vault", "/admin", "/stonerism", "/enter",
];

function shouldSkipStartup(path: string): boolean {
  return SKIP_STARTUP_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

const SKIP_BOOT_KEY = "vanta-skip-os-boot";

// ── Boot phase type ────────────────────────────────────────────────────────
type BootPhase = "loader" | "boot" | "entry" | "done";

function getInitialPhase(path: string): BootPhase {
  if (shouldSkipStartup(path)) return "done";

  const sessionBooted = !!sessionStorage.getItem(STARTUP_SESSION_KEY);
  const skipBoot = !!localStorage.getItem(SKIP_BOOT_KEY);

  if (!sessionBooted) return "loader";       // First visit this session: show loader
  if (!skipBoot) return "boot";              // Seen loader but not boot: show OS boot
  return "done";                             // Fully skipped
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/post/:id" component={PostPage} />
      <Route path="/create" component={CreatePost} />
      <Route path="/edit/:id" component={EditPost} />
      <Route path="/search" component={SearchPage} />
      <Route path="/about" component={About} />
      <Route path="/music" component={Music} />
      <Route path="/releases" component={Releases} />
      <Route path="/releases/new" component={ReleasesNew} />
      <Route path="/releases/edit/:id" component={ReleasesEdit} />
      <Route path="/worlds" component={Worlds} />
      <Route path="/enter" component={Enter} />
      <Route path="/vault" component={Vault} />
      <Route path="/world" component={World} />
      <Route path="/wireline" component={Wireline} />
      <Route path="/fract" component={Fract} />
      <Route path="/himalayas" component={Himalayas} />
      <Route path="/fgh" component={FracturedGodhead} />

      {/* ── User auth + profiles ────────────────────────────────── */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile/edit" component={ProfileEdit} />
      <Route path="/profile/:username" component={Profile} />

      {/* ── Public Vanta OS pages ────────────────────────────────── */}
      <Route path="/devlogs" component={DevLogs} />
      <Route path="/devlogs/:slug" component={DevLogDetail} />
      <Route path="/early-access" component={EarlyAccess} />
      <Route path="/early-access/:slug" component={EarlyAccessApp} />

      {/* ── Admin ───────────────────────────────────────────────── */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/blog" component={AdminBlog} />
      <Route path="/admin/releases" component={AdminReleases} />
      <Route path="/admin/vault" component={AdminVault} />
      <Route path="/admin/stonerism" component={StonerismAdmin} />
      <Route path="/admin/world" component={AdminWorld} />
      <Route path="/admin/black-index" component={AdminBlackIndex} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/devlogs" component={AdminDevLogs} />
      <Route path="/admin/waitlists" component={AdminWaitlists} />
      <Route path="/admin/apps" component={AdminApps} />
      <Route path="/admin/settings" component={AdminSettings} />

      {/* ── Stonerism ───────────────────────────────────────────── */}
      <Route path="/stonerism" component={StonerismHome} />
      <Route path="/stonerism/cannabis" component={StonerismCannabis} />
      <Route path="/stonerism/places" component={StonerismPlaces} />
      <Route path="/stonerism/brands" component={StonerismBrands} />
      <Route path="/stonerism/munchies" component={StonerismMunchies} />
      <Route path="/stonerism/wellness" component={StonerismWellness} />
      <Route path="/stonerism/inner-life" component={StonerismInnerLife} />
      <Route path="/stonerism/events" component={StonerismEvents} />
      <Route path="/stonerism/journal" component={StonerismJournal} />
      <Route path="/stonerism/article/:slug" component={StonerismArticle} />
      <Route path="/stonerism/review/:slug" component={StonerismReview} />
      <Route path="/stonerism/business/:slug" component={StonerismBusiness} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [phase, setPhase] = useState<BootPhase>(
    () => getInitialPhase(window.location.pathname)
  );

  const handleLoaderComplete = useCallback(() => {
    const skipBoot = !!localStorage.getItem(SKIP_BOOT_KEY);
    sessionStorage.setItem(STARTUP_SESSION_KEY, "1");
    setPhase(skipBoot ? "done" : "boot");
  }, []);

  const handleBootComplete = useCallback(() => {
    setPhase("entry");
  }, []);

  const handleEnterComplete = useCallback(() => {
    setPhase("done");
  }, []);

  // Safety fallbacks: if any phase gets stuck, auto-advance to the next one
  useEffect(() => {
    if (phase === "loader") {
      // StartupScreen is 2.8s; 5s gives it ample time before forcing advance
      const t = setTimeout(() => {
        sessionStorage.setItem(STARTUP_SESSION_KEY, "1");
        setPhase("boot");
      }, 5_000);
      return () => clearTimeout(t);
    }
    if (phase === "boot") {
      const t = setTimeout(() => setPhase("entry"), 10_000);
      return () => clearTimeout(t);
    }
    if (phase === "entry") {
      const t = setTimeout(() => setPhase("done"), 30_000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />

          {/* Phase 1: Original Vanta loader */}
          {phase === "loader" && (
            <StartupScreen onComplete={handleLoaderComplete} />
          )}

          {/* Phase 2: Vanta OS boot sequence */}
          {phase === "boot" && (
            <VantaOSBoot onComplete={handleBootComplete} />
          )}

          {/* Phase 3: Cinematic Enter Vanta screen */}
          {phase === "entry" && (
            <EnterVanta onEnter={handleEnterComplete} />
          )}

          {/* Phase 4: Normal app */}
          {phase === "done" && <Router />}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
