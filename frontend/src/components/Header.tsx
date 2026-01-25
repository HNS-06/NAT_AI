import { useGetCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Header() {
  const { data: userProfile } = useGetCallerUserProfile();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative">
              <img
                src="/assets/logo.png"
                alt="Nat"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent">
                Nat
              </h1>
              <p className="text-xs text-muted-foreground">Your intelligent companion</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {userProfile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 backdrop-blur-sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="/assets/generated/ai-avatar-transparent.dim_150x150.png" />
                  <AvatarFallback>{userProfile.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">{userProfile.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
