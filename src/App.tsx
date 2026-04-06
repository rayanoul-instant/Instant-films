import { useState, useCallback, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/layout/SplashScreen";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import UserProfilePage from "./pages/UserProfilePage";
import FilmDetailPage from "./pages/FilmDetailPage";
import DiscussionsPage from "./pages/DiscussionsPage";
import DiscussionDetailPage from "./pages/DiscussionDetailPage";
import MessagesPage from "./pages/MessagesPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import CourtMetrageDetailPage from "./pages/CourtMetrageDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      <SplashScreen show={showSplash} onDone={handleSplashDone} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/user/:id" element={<UserProfilePage />} />
                <Route path="/films/:id" element={<FilmDetailPage />} />
                <Route path="/discussions" element={<DiscussionsPage />} />
                <Route path="/discussions/:id" element={<DiscussionDetailPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/courts-metrages/:id" element={<CourtMetrageDetailPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
