'use client';

import { useSessionStore } from '@/store/sessionStore';
import ChatInterface from '@/components/ChatInterface';
import WelcomeDashboard from '@/components/WelcomeDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function Home() {
  const { match, connectionStatus, testingMode } = useSessionStore();
  
  // Show chat interface if user is in a match or connected/connecting
  const showChatInterface = match || connectionStatus === 'connected' || connectionStatus === 'connecting' || testingMode;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50" data-page="home">
        {showChatInterface ? (
          <ChatInterface />
        ) : (
          <WelcomeDashboard />
        )}
      </div>
    </ProtectedRoute>
  );
}