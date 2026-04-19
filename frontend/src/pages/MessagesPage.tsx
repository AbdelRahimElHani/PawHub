import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MessengerWorkspace } from "../messenger/MessengerWorkspace";

export function MessagesPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const tid = threadId ? Number(threadId) : NaN;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MessengerWorkspace
      activeThreadId={tid}
      onSelectThread={(id) => navigate(`/messages/${id}`)}
      variant="page"
      onNewDmThread={(id) => navigate(`/messages/${id}`)}
    />
  );
}
