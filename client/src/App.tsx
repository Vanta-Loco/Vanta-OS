import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { StartupScreen, STARTUP_SESSION_KEY } from "@/components/startup-screen";
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
import NotFound from "@/pages/not-found";

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
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/vault" component={Vault} />
      <Route path="/world" component={World} />
      <Route path="/wireline" component={Wireline} />
      <Route path="/fract" component={Fract} />
      <Route path="/himalayas" component={Himalayas} />
      <Route path="/fgh" component={FracturedGodhead} />
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
      <Route path="/admin/stonerism" component={StonerismAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showStartup, setShowStartup] = useState(
    () =>
      !sessionStorage.getItem(STARTUP_SESSION_KEY) &&
      window.location.pathname !== "/world" &&
      !window.location.pathname.startsWith("/stonerism")
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {showStartup && (
            <StartupScreen onComplete={() => setShowStartup(false)} />
          )}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
