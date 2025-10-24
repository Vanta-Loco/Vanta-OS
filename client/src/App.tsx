import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import PostPage from "@/pages/post";
import CreatePost from "@/pages/create";
import EditPost from "@/pages/edit";
import SearchPage from "@/pages/search";
import About from "@/pages/about";
import Music from "@/pages/music";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
