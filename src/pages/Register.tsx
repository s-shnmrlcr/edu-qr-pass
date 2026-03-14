import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore, Role, GradeLevel } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const GRADE_LEVELS: GradeLevel[] = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const Register = () => {
  const navigate = useNavigate();
  const register = useStore(s => s.register);
  const currentUser = useStore(s => s.currentUser);
  const authInitializing = useStore(s => s.authInitializing);
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as Role | '',
    gradeLevel: '' as GradeLevel | '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authInitializing && currentUser) {
      navigate('/dashboard');
    }
  }, [authInitializing, currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) { toast.error('Please select a role'); return; }
    if (form.role === 'teacher' && !form.gradeLevel) { toast.error('Please select a grade level'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    const result = await register({
      fullName: form.fullName,
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role as Role,
      gradeLevel: form.role === 'teacher' ? form.gradeLevel as GradeLevel : undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success('Registration successful! Please log in.');
      navigate('/login');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="bg-card rounded-2xl shadow-lg border p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-muted-foreground text-sm mt-1">Register to access EduTrack</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="juandc" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@school.edu" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter password" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: Role) => setForm(f => ({ ...f, role: v, gradeLevel: v === 'admin' ? '' : f.gradeLevel }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'teacher' && (
              <div className="animate-fade-up">
                <Label>Assigned Grade Level</Label>
                <Select value={form.gradeLevel} onValueChange={(v: GradeLevel) => setForm(f => ({ ...f, gradeLevel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
