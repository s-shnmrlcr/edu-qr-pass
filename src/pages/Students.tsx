import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore, GradeLevel, Gender, Student } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Download, Search, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const GRADE_LEVELS: GradeLevel[] = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const GENDERS: Gender[] = ['Male', 'Female'];

const Students = () => {
  const currentUser = useStore(s => s.currentUser);
  const allStudents = useStore(s => s.students);
  const students = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allStudents;
    return allStudents.filter(s => s.gradeLevel === currentUser.gradeLevel);
  }, [allStudents, currentUser]);
  const addStudent = useStore(s => s.addStudent);
  const updateStudent = useStore(s => s.updateStudent);
  const deleteStudent = useStore(s => s.deleteStudent);

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrPreviewStudent, setQrPreviewStudent] = useState<Student | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');
  const [form, setForm] = useState({ studentId: '', fullName: '', gradeLevel: '' as GradeLevel | '', gender: '' as Gender | '' });

  // QR code cache
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  const generateQR = useCallback(async (student: Student): Promise<string> => {
    const data = JSON.stringify({ studentId: student.studentId, name: student.fullName, grade: student.gradeLevel });
    return await QRCode.toDataURL(data, { width: 256, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
  }, []);

  // Generate QR codes for all students
  useEffect(() => {
    const gen = async () => {
      const newCache: Record<string, string> = {};
      for (const s of students) {
        if (qrCache[s.id]) {
          newCache[s.id] = qrCache[s.id];
        } else {
          newCache[s.id] = await generateQR(s);
        }
      }
      setQrCache(newCache);
    };
    gen();
  }, [students, generateQR, qrCache]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search && !s.fullName.toLowerCase().includes(search.toLowerCase()) && !s.studentId.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGrade !== 'all' && s.gradeLevel !== filterGrade) return false;
      if (filterGender !== 'all' && s.gender !== filterGender) return false;
      return true;
    });
  }, [students, search, filterGrade, filterGender]);

  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditingStudent(null);
    setForm({
      studentId: '',
      fullName: '',
      gradeLevel: currentUser?.role === 'teacher' ? (currentUser.gradeLevel || '') : '',
      gender: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setForm({ studentId: s.studentId, fullName: s.fullName, gradeLevel: s.gradeLevel, gender: s.gender });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradeLevel || !form.gender) { toast.error('Please fill all fields'); return; }

    if (editingStudent) {
      const result = await updateStudent(editingStudent.id, {
        studentId: form.studentId,
        fullName: form.fullName,
        gradeLevel: form.gradeLevel as GradeLevel,
        gender: form.gender as Gender,
      });
      if (!result.success) { toast.error(result.error); return; }
      toast.success('Student updated');
    } else {
      const result = await addStudent({
        studentId: form.studentId,
        fullName: form.fullName,
        gradeLevel: form.gradeLevel as GradeLevel,
        gender: form.gender as Gender,
      });
      if (!result.success) { toast.error(result.error); return; }
      toast.success('Student added successfully');
    }
    setDialogOpen(false);
  };

  const handleDelete = async (s: Student) => {
    if (window.confirm(`Delete ${s.fullName}?`)) {
      const result = await deleteStudent(s.id);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete student');
        return;
      }
      toast.success('Student deleted');
    }
  };

  const handleDownloadQR = async (s: Student) => {
    try {
      const url = qrCache[s.id] || await generateQR(s);
      const link = document.createElement('a');
      link.download = `QR_${s.studentId}_${s.fullName.replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handlePreviewQR = async (s: Student) => {
    const url = qrCache[s.id] || await generateQR(s);
    setQrPreviewUrl(url);
    setQrPreviewStudent(s);
    setQrPreviewOpen(true);
  };

  const availableGrades = currentUser?.role === 'admin' ? GRADE_LEVELS : (currentUser?.gradeLevel ? [currentUser.gradeLevel] : GRADE_LEVELS);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" /> Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        {currentUser?.role === 'admin' && (
          <Select value={filterGrade} onValueChange={v => { setFilterGrade(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterGender} onValueChange={v => { setFilterGender(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 whitespace-nowrap">Full Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Grade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Gender</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">QR Code</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No students found</td></tr>
              ) : paginated.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.studentId}</td>
                  <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card whitespace-nowrap">{s.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.gradeLevel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.gender}</td>
                  <td className="px-4 py-3 text-center">
                    {qrCache[s.id] ? (
                      <button onClick={() => handlePreviewQR(s)} className="inline-block hover:opacity-80 transition-opacity">
                        <img src={qrCache[s.id]} alt={`QR for ${s.fullName}`} className="w-16 h-16 rounded border mx-auto" />
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center mx-auto">
                        <QrCode className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadQR(s)} title="Download QR">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} title="Delete" className="hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Student ID</Label>
              <Input required value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="e.g., 2024-001" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Grade Level</Label>
              <Select value={form.gradeLevel} onValueChange={(v: GradeLevel) => setForm(f => ({ ...f, gradeLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {availableGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v: Gender) => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
                {editingStudent ? 'Update' : 'Add Student'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Preview Dialog */}
      <Dialog open={qrPreviewOpen} onOpenChange={setQrPreviewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          {qrPreviewStudent && (
            <div className="text-center space-y-4">
              <img src={qrPreviewUrl} alt={`QR for ${qrPreviewStudent.fullName}`} className="w-48 h-48 mx-auto rounded-lg border" />
              <div>
                <p className="font-semibold text-foreground">{qrPreviewStudent.fullName}</p>
                <p className="text-sm text-muted-foreground">{qrPreviewStudent.studentId} - {qrPreviewStudent.gradeLevel}</p>
              </div>
              <Button onClick={() => handleDownloadQR(qrPreviewStudent)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="w-4 h-4 mr-2" /> Download PNG
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
