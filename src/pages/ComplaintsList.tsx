import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  GraduationCap, 
  LogOut, 
  Eye, 
  Calendar, 
  User, 
  FileText, 
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  UserPlus
} from "lucide-react";

// Types
type Status = "לא שויך" | "פתוח" | "בטיפול" | "הושלם";

type Update = {
  date: string;
  time: string;
  author: string;
  message: string;
};

type Complaint = {
  id: string;
  title: string;
  submitter: string;
  category: string;
  status: Status;
  date: string;
  description: string;
  assignedTo?: string | null;
  updates: Update[];
};

const STORAGE_KEY = "complaints_v1";

// Initial mock data
const initialComplaints: Complaint[] = [
  {
    id: "1",
    title: "בעיה עם הארוחות בקפטריה",
    submitter: "יוסי כהן",
    category: "שירותי מזון",
    status: "לא שויך",
    date: "2024-01-15",
    description: "איכות הארוחות ירודה וההמתנה ארוכה מדי...",
    assignedTo: null,
    updates: [
      { date: "2024-01-15", time: "14:30", author: "מערכת", message: "פנייה נקלטה במערכת" },
    ],
  },
  {
    id: "2",
    title: "רעש בשעות הפסקה",
    submitter: "מרים לוי",
    category: "סביבת למידה",
    status: "בטיפול",
    date: "2024-01-12",
    description: "רעש מופרז במסדרונות המפריע לשיעורים...",
    assignedTo: "דני",
    updates: [
      { date: "2024-01-12", time: "11:20", author: "מערכת", message: "פנייה נקלטה במערכת" },
      { date: "2024-01-13", time: "08:45", author: "דני", message: "התחלתי לטפל בפנייה" },
    ],
  },
  {
    id: "3",
    title: "בעיות עם מערכת המחשבים",
    submitter: "דוד אברהם",
    category: "טכנולוגיה",
    status: "פתוח",
    date: "2024-01-10",
    description: "מחשבים לא עובדים במעבדה...",
    assignedTo: "רחל",
    updates: [
      { date: "2024-01-10", time: "09:05", author: "מערכת", message: "פנייה נקלטה במערכת" },
      { date: "2024-01-10", time: "10:10", author: "רחל", message: "הפנייה נבדקת" },
    ],
  },
  {
    id: "4",
    title: "חוסר ניקיון בחדרי השירותים",
    submitter: "שרה מזרחי",
    category: "ניקיון",
    status: "הושלם",
    date: "2024-01-08",
    description: "חדרי השירותים לא מנוקים כראוי...",
    assignedTo: "יואב",
    updates: [
      { date: "2024-01-08", time: "08:15", author: "מערכת", message: "פנייה נקלטה במערכת" },
      { date: "2024-01-08", time: "12:00", author: "יואב", message: "בוצע ניקיון יסודי" },
      { date: "2024-01-09", time: "09:30", author: "מערכת", message: "הפנייה הושלמה" },
    ],
  },
];

const ComplaintsList = () => {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved) as Complaint[]; } catch {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialComplaints));
    return initialComplaints;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");

  // persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const q = searchTerm.trim();
      const matchesSearch = !q ||
        complaint.title.includes(q) ||
        complaint.submitter.includes(q) ||
        complaint.description.includes(q) ||
        complaint.category.includes(q) ||
        (complaint.assignedTo ?? "").includes(q);
      const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter as Status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [complaints, searchTerm, categoryFilter, statusFilter]);

  const handleLogout = () => {
    navigate("/");
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "לא שויך":
        return <Badge variant="secondary">לא שויך</Badge>;
      case "פתוח":
        return <Badge className="bg-primary text-primary-foreground">פתוח</Badge>;
      case "בטיפול":
        return <Badge variant="outline" className="border-border text-foreground">בטיפול</Badge>;
      case "הושלם":
        return <Badge className="bg-green-600 text-white">הושלם</Badge>;
      default:
        return <Badge>פתוח</Badge>;
    }
  };

  const handleClaim = (id: string) => {
    const username = localStorage.getItem("username");
    if (!username) {
      toast("יש להתחבר עם שם משתמש לפני שיוך פנייה");
      navigate("/");
      return;
    }
    setComplaints((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const now = new Date();
      const date = now.toLocaleDateString('he-IL');
      const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      return {
        ...c,
        status: c.status === "הושלם" ? c.status : "בטיפול",
        assignedTo: username,
        updates: [
          ...c.updates,
          { date, time, author: username, message: "הפנייה שויכה לטיפול" },
        ],
      };
    }));
    toast.success("הפנייה שויכה אליך בהצלחה");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="hebrew-title text-primary">מערכת ניהול פניות</h1>
                <p className="text-sm text-muted-foreground">בית ספר יסודי הרצל</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 rounded-xl"
              >
                <SettingsIcon className="w-4 h-4" />
                הגדרות
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="w-4 h-4" />
                יציאה
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="card-elegant mb-8">
          <CardHeader>
            <CardTitle className="hebrew-subtitle flex items-center gap-2">
              <Filter className="w-5 h-5" />
              חיפוש וסינון פניות
            </CardTitle>
            <CardDescription className="hebrew-body">
              מצאו פניות לפי נושא, מגיש, מטפל/ת או תוכן
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="חיפוש פניות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-12 rounded-xl border-border focus:border-primary"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 rounded-xl border-border focus:border-primary">
                  <SelectValue placeholder="נושא הפנייה" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="הכל">כל הנושאים</SelectItem>
                  <SelectItem value="שירותי מזון">שירותי מזון</SelectItem>
                  <SelectItem value="סביבת למידה">סביבת למידה</SelectItem>
                  <SelectItem value="טכנולוגיה">טכנולוגיה</SelectItem>
                  <SelectItem value="ניקיון">ניקיון</SelectItem>
                  <SelectItem value="תחבורה">תחבורה</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-xl border-border focus:border-primary">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="הכל">כל הסטטוסים</SelectItem>
                  <SelectItem value="לא שויך">לא שויך</SelectItem>
                  <SelectItem value="פתוח">פתוח</SelectItem>
                  <SelectItem value="בטיפול">בטיפול</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="hebrew-subtitle text-foreground">
            נמצאו {filteredComplaints.length} פניות
          </h2>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            מעודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </div>
        </div>

        {/* Complaints Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredComplaints.map((complaint) => (
            <Card key={complaint.id} className="card-elegant group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="hebrew-subtitle text-lg mb-2 group-hover:text-primary transition-colors">
                      {complaint.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {complaint.submitter}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {complaint.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">קטגוריה:</span>
                    <span className="font-medium">{complaint.category}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">מטפל/ת:</span>
                    <span className="font-medium">{complaint.assignedTo || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">מס' עדכונים:</span>
                    <span className="font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      {complaint.updates.length}
                    </span>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 hebrew-body">
                      {complaint.description}
                    </p>
                  </div>

                    <div className="pt-3 border-t border-border grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => navigate(`/complaint/${complaint.id}`)}
                        variant="secondary"
                        className="w-full rounded-xl flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        צפייה בפרטים
                      </Button>
                      {complaint.status === "לא שויך" && (
                        <Button 
                          onClick={() => handleClaim(complaint.id)}
                          className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all rounded-xl flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          שיוך אליי
                        </Button>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredComplaints.length === 0 && (
          <Card className="card-elegant text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="hebrew-subtitle mb-2">לא נמצאו פניות</h3>
              <p className="text-muted-foreground hebrew-body">
                נסו לשנות את קריטריוני החיפוש או הסינון
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ComplaintsList;
