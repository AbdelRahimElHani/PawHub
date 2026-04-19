import type { ReactElement } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./shell/Layout";
import { GuestLanding, Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CatsPage } from "./pages/CatsPage";
import { PawMatchPage } from "./pages/PawMatchPage";
import { MatchesPage } from "./pages/MatchesPage";
import { MarketBrowsePage } from "./pages/MarketBrowsePage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import { MarketEditPage } from "./pages/MarketEditPage";
import { MarketHubLayout } from "./pages/MarketHubLayout";
import { MarketMyListingsPage } from "./pages/MarketMyListingsPage";
import { MarketNewPage } from "./pages/MarketNewPage";
import { AdoptPage } from "./pages/AdoptPage";
import { AdoptDetailPage } from "./pages/AdoptDetailPage";
import { AdoptNewPage } from "./pages/AdoptNewPage";
import { ShelterPage } from "./pages/ShelterPage";
import { AdminSheltersPage } from "./pages/AdminSheltersPage";
import { AccountPage } from "./pages/AccountPage";
import { MessagesPage } from "./pages/MessagesPage";

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

function LegacyChatRedirect() {
  const { threadId } = useParams();
  return <Navigate to={threadId ? `/messages/${threadId}` : "/messages"} replace />;
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
        <Route path="/market" element={<MarketHubLayout />}>
          <Route index element={<MarketBrowsePage />} />
          <Route path="selling" element={<MarketMyListingsPage />} />
        </Route>
        <Route path="/market/new" element={<MarketNewPage />} />
        <Route path="/market/:id/edit" element={<MarketEditPage />} />
        <Route path="/market/:id" element={<MarketDetailPage />} />
        <Route path="/adopt" element={<AdoptPage />} />
        <Route path="/adopt/shelter" element={<ShelterPage />} />
        <Route path="/adopt/new" element={<AdoptNewPage />} />
        <Route path="/adopt/:id" element={<AdoptDetailPage />} />
        <Route path="/inbox" element={<Navigate to="/messages" replace />} />
        <Route path="/messages/:threadId?" element={<MessagesPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/chat/:threadId" element={<LegacyChatRedirect />} />
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
