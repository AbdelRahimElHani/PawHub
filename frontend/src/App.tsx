import type { ReactElement } from "react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./shell/Layout";
import { GuestLanding, Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CatsPage } from "./pages/CatsPage";
import { PawMatchPage } from "./pages/PawMatchPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MarketPage } from "./pages/MarketPage";
import { MarketNewPage } from "./pages/MarketNewPage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import { AdoptPage } from "./pages/AdoptPage";
import { AdoptDetailPage } from "./pages/AdoptDetailPage";
import { AdoptNewPage } from "./pages/AdoptNewPage";
import { ShelterPage } from "./pages/ShelterPage";
import { AdminSheltersPage } from "./pages/AdminSheltersPage";
import { InboxPage } from "./pages/InboxPage";
import { AccountPage } from "./pages/AccountPage";

const ChatPage = lazy(async () => {
  const m = await import("./pages/ChatPage");
  return { default: m.ChatPage };
});

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user || user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

function AppRoot() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <GuestLanding />;
  return (
    <Layout>
      <Home />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppRoot />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/cats" element={<CatsPage />} />
        <Route path="/pawmatch" element={<PawMatchPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/market/new" element={<MarketNewPage />} />
        <Route path="/market/:id" element={<MarketDetailPage />} />
        <Route path="/adopt" element={<AdoptPage />} />
        <Route path="/adopt/shelter" element={<ShelterPage />} />
        <Route path="/adopt/new" element={<AdoptNewPage />} />
        <Route path="/adopt/:id" element={<AdoptDetailPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route
          path="/chat/:threadId"
          element={
            <Suspense fallback={<p style={{ padding: "1rem" }}>Loading chat…</p>}>
              <ChatPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/shelters"
          element={
            <RequireAdmin>
              <AdminSheltersPage />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
