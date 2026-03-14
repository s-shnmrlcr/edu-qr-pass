import { useState, useMemo } from 'react';
import { useStore, GradeLevel, AttendanceRecord } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const GRADE_LEVELS: GradeLevel[] = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const AttendanceLogs = () => {
  const currentUser = useStore(s => s.currentUser);
  const attendance = useStore(s => s.getAttendanceForUser());
  const students = useStore(s => s.getStudentsForUser());

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const today = new Date().toLocaleDateString('en-CA');

  // Build full records including absent students
  const fullRecords = useMemo(() => {
    const dateToUse = filterDate || today;
    const dayAttendance = attendance.filter(a => a.date === dateToUse);
    const scannedIds = new Set(dayAttendance.map(a => a.studentId));

    const absentRecords: AttendanceRecord[] = students
      .filter(s => !scannedIds.has(s.studentId))
      .filter(s => filterGrade === 'all' || s.gradeLevel === filterGrade)
      .map(s => ({
        id: `absent-${s.id}-${dateToUse}`,
        studentId: s.studentId,
        studentName: s.fullName,
        gradeLevel: s.gradeLevel,
        date: dateToUse,
        timeScanned: '',
        status: 'Absent' as const,
      }));

    const allRecords = [...dayAttendance, ...absentRecords];
    return allRecords;
  }, [attendance, students, filterDate, filterGrade, today]);

  const filtered = useMemo(() => {
    return fullRecords.filter(r => {
      if (search && !r.studentName.toLowerCase().includes(search.toLowerCase()) && !r.studentId.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGrade !== 'all' && r.gradeLevel !== filterGrade) return false;
      return true;
    }).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [fullRecords, search, filterGrade]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const downloadCSV = () => {
    if (filtered.length === 0) { toast.error('No records to export'); return; }
    const header = 'Student ID,Student Name,Grade Level,Date,Time Scanned,Status';
    const rows = filtered.map(r =>
      `${r.studentId},${r.studentName},${r.gradeLevel},${r.date},${r.timeScanned || ''},${r.status}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_${filterDate || today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={downloadCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Download CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }} className="w-44" />
        {currentUser?.role === 'admin' && (
          <Select value={filterGrade} onValueChange={v => { setFilterGrade(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Student ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 whitespace-nowrap">Student Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Grade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Time Scanned</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  No records found
                </td></tr>
              ) : paginated.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{r.studentId}</td>
                  <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card whitespace-nowrap">{r.studentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.gradeLevel}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.timeScanned || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'Present' ? 'status-present' : r.status === 'Late' ? 'status-late' : 'status-absent'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default AttendanceLogs;
