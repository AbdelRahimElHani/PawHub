import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { ChatStompProvider } from "./chat/ChatStompContext";
import { ThreadNotificationProvider } from "./notifications/ThreadNotificationContext";
import { ModerationNoticeProvider } from "./components/notifications/ModerationNoticeContext";
import { NotificationToasts } from "./components/notifications/NotificationToasts";
import { MediaLightboxProvider } from "./components/media/MediaLightboxContext";
import { useAuth } from "./auth/AuthContext";
import "./theme.css";

function NotificationToastHost() {
  const { token } = useAuth();
  return token ? <NotificationToasts /> : null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ModerationNoticeProvider>
            <MediaLightboxProvider>
              <ChatStompProvider>
                <ThreadNotificationProvider>
                  <NotificationToastHost />
                  <div className="ph-app-root">
                    <App />
                  </div>
                </ThreadNotificationProvider>
              </ChatStompProvider>
            </MediaLightboxProvider>
          </ModerationNoticeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
