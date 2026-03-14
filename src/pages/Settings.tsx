import { useStore } from '@/lib/store';
import { User, Shield } from 'lucide-react';

const SettingsPage = () => {
  const currentUser = useStore(s => s.currentUser);

  if (!currentUser) return null;

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Account information</p>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xl font-bold">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{currentUser.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
            <p className="text-sm text-foreground">{currentUser.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</p>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-accent" />
              <p className="text-sm text-foreground capitalize">{currentUser.role}</p>
            </div>
          </div>
          {currentUser.gradeLevel && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Grade</p>
              <p className="text-sm text-foreground">{currentUser.gradeLevel}</p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Member Since</p>
            <p className="text-sm text-foreground">{new Date(currentUser.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
