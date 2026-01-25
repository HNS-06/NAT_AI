import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import ProfileSetupModal from './components/ProfileSetupModal';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();

  const showProfileSetup = !profileLoading && !userProfile;
  const showChat = !profileLoading && !!userProfile;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
        {/* Background Blobs */}
        {/* Background Blobs - Lighting from all sides */}
        {/* Background Blobs - Diffuse Ambient Lighting */}
        <div className="fixed top-[-20%] left-[-20%] w-[1200px] h-[1200px] rounded-full bg-primary/40 blur-[150px] mix-blend-screen animate-blob animate-color-shift filter pointer-events-none opacity-50" />
        <div className="fixed top-[-20%] right-[-20%] w-[1200px] h-[1200px] rounded-full bg-accent/40 blur-[150px] mix-blend-screen animate-blob animate-color-shift animation-delay-2000 filter pointer-events-none opacity-50" />
        <div className="fixed bottom-[-20%] left-[-20%] w-[1200px] h-[1200px] rounded-full bg-chart-1/40 blur-[150px] mix-blend-screen animate-blob animate-color-shift animation-delay-4000 filter pointer-events-none opacity-50" />
        <div className="fixed bottom-[-20%] right-[-20%] w-[1200px] h-[1200px] rounded-full bg-chart-2/40 blur-[150px] mix-blend-screen animate-blob animate-color-shift animation-delay-2000 filter pointer-events-none opacity-50" />

        {/* Glassmorphism Overlay - The "Lens" */}
        <div className="fixed inset-0 bg-background/5 backdrop-blur-[100px] pointer-events-none z-0" />

        <div className="relative z-10 flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">
            {profileLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto">
                    <img src="/assets/generated/ai-brain-hologram-transparent.dim_200x200.png" alt="AI" className="w-full h-full animate-pulse" />
                  </div>
                  <p className="text-muted-foreground">Initializing...</p>
                </div>
              </div>
            )}
            {showProfileSetup && <ProfileSetupModal />}
            {showChat && <ChatInterface />}
          </main>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
