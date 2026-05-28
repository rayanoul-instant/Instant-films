import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopDock } from "@/components/layout/DesktopDock";

const Index = lazy(() => import("./pages/Index"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const FilmDetailPage = lazy(() => import("./pages/FilmDetailPage"));
const DiscussionsPage = lazy(() => import("./pages/DiscussionsPage"));
const DiscussionDetailPage = lazy(() => import("./pages/DiscussionDetailPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const CourtMetrageDetailPage = lazy(() => import("./pages/CourtMetrageDetailPage"));
const MentionsLegalesPage = lazy(() => import("./pages/MentionsLegalesPage"));
const CGUPage = lazy(() => import("./pages/CGUPage"));
const PolitiqueConfidentialitePage = lazy(() => import("./pages/PolitiqueConfidentialitePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Disable browser's native scroll restoration so we control it ourselves
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

function ScrollManager() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/user/:id" element={<UserProfilePage />} />
            <Route path="/films/:slug" element={<FilmDetailPage />} />
            <Route path="/discussions" element={<DiscussionsPage />} />
            <Route path="/discussions/:id" element={<DiscussionDetailPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/courts-metrages/:id" element={<CourtMetrageDetailPage />} />
            <Route path="/legal" element={<MentionsLegalesPage />} />
            <Route path="/terms" element={<CGUPage />} />
            <Route path="/privacy" element={<PolitiqueConfidentialitePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() =>
    typeof window !== 'undefined' && !sessionStorage.getItem('splashSeen')
  );

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem('splashSeen', '1');
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
              <ScrollManager />
              <DesktopDock />
              <BottomNav />
<AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
