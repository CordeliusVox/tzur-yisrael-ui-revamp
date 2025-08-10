import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  GraduationCap,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Send,
  Trash2,
  UserPlus,
  Clock,
  CheckCircle2
} from "lucide-react";

// Shared types
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
  submitterEmail?: string;
  category: string;
  status: Status;
  date: string;
  description: string;
  assignedTo?: string | null;
  updates: Update[];
};

const STORAGE_KEY = "complaints_v1";

const ComplaintDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [response, setResponse] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [newStatus, setNewStatus] = useState<Status | "ללא שינוי">("ללא שינוי");

  // Load from storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list: Complaint[] = saved ? (() => { try { return JSON.parse(saved); } catch { return []; } })() : [];
    setAllComplaints(list);
    const c = list.find((x) => x.id === id);
    setComplaint(c ?? null);
  }, [id]);

  const saveComplaint = (updated: Complaint) => {
    setComplaint(updated);
    const next = allComplaints.map((c) => (c.id === updated.id ? updated : c));
    setAllComplaints(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const username = useMemo(() => localStorage.getItem("username") || "מערכת", []);

  if (!complaint) {
    return (
      <div className="min-h-screen flex items-center justify-center rtl">
        <Card className="card-elegant max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="hebrew-subtitle mb-2">פנייה לא נמצאה</h2>
            <p className="text-muted-foreground hebrew-body mb-4">
              מס' הפנייה שביקשתם אינו קיים במערכת
            </p>
            <Button onClick={() => navigate("/complaints")} className="rounded-xl">
              חזרה לרשימת הפניות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteComplaint = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      const remaining = allComplaints.filter((c) => c.id !== complaint.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      toast({
        title: "פנייה נמחקה בהצלחה",
        description: "הפנייה הוסרה מהמערכת",
      });
      setIsDeleting(false);
      navigate("/complaints");
    }, 600);
  };

  const handleClaim = () => {
    const u = localStorage.getItem("username");
    if (!u) {
      toast({ title: "יש להתחבר", description: "אנא התחברו עם שם משתמש", variant: "destructive" });
      navigate("/");
      return;
    }
    if (complaint.status !== "לא שויך") return;
    const now = new Date();
    const updated: Complaint = {
      ...complaint,
      status: "בטיפול",
      assignedTo: u,
      updates: [
        ...complaint.updates,
        { date: now.toLocaleDateString('he-IL'), time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), author: u, message: "הפנייה שויכה לטיפול" },
      ],
    };
    saveComplaint(updated);
    toast({ title: "שויך בהצלחה", description: "הפנייה שויכה אליך" });
  };

  const handleAddUpdate = () => {
    const msg = newUpdate.trim();
    if (!msg && newStatus === "ללא שינוי") {
      toast({ title: "אין עדכון", description: "הוסיפו טקסט או בחרו סטטוס" });
      return;
    }
    const u = localStorage.getItem("username") || "מערכת";
    const now = new Date();
    const statusToApply: Status = newStatus === "ללא שינוי" ? complaint.status : newStatus;
    const updated: Complaint = {
      ...complaint,
      status: statusToApply,
      assignedTo: complaint.assignedTo ?? u,
      updates: [
        ...complaint.updates,
        ...(msg ? [{ date: now.toLocaleDateString('he-IL'), time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), author: u, message: msg }] as Update[] : []),
        ...(newStatus !== "ללא שינוי" ? [{ date: now.toLocaleDateString('he-IL'), time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), author: u, message: `סטטוס עודכן ל- ${statusToApply}` }] as Update[] : []),
      ],
    };
    saveComplaint(updated);
    setNewUpdate("");
    setNewStatus("ללא שינוי");
    toast({ title: "עודכן", description: "הפנייה עודכנה בהצלחה" });
  };

  const markCompleted = () => {
    const u = localStorage.getItem("username") || "מערכת";
    const now = new Date();
    const updated: Complaint = {
      ...complaint,
      status: "הושלם",
      updates: [
        ...complaint.updates,
        { date: now.toLocaleDateString('he-IL'), time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), author: u, message: "הפנייה סומנה כהושלמה" },
      ],
    };
    saveComplaint(updated);
    toast({ title: "הושלם", description: "הפנייה הושלמה" });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="hebrew-title text-primary">פרטי פנייה #{complaint.id}</h1>
                <p className="text-sm text-muted-foreground">מערכת ניהול פניות</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/complaints")}
              className="flex items-center gap-2 rounded-xl"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לרשימה
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint Header */}
            <Card className="card-elegant">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="hebrew-title text-xl mb-3">
                      {complaint.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {complaint.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {complaint.submitter}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(complaint.status)}
                    <div className="text-xs text-muted-foreground">
                      מטפל/ת: <span className="font-medium">{complaint.assignedTo || "—"}</span>
                    </div>
                    {complaint.status === "לא שויך" && (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={handleClaim}>
                        <UserPlus className="w-4 h-4 ml-1" /> שיוך אליי
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Complaint Description */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  תיאור הפנייה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="hebrew-body leading-relaxed text-foreground whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>

            {/* Status and updates timeline */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  סטטוס והתקדמות
                </CardTitle>
                <CardDescription>צפייה והוספת עדכונים עד לסיום הפנייה</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Timeline */}
                <div className="space-y-4">
                  {complaint.updates.length === 0 && (
                    <p className="text-sm text-muted-foreground">אין עדכונים להצגה</p>
                  )}
                  <div className="space-y-3">
                    {complaint.updates.map((u, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground">
                            {u.date} • {u.time} • {u.author}
                          </div>
                          <div className="text-sm">{u.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Add Update */}
                <div className="space-y-3">
                  <Label htmlFor="status">עדכון סטטוס</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                      <SelectTrigger id="status" className="rounded-xl">
                        <SelectValue placeholder="בחר/י סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ללא שינוי">ללא שינוי</SelectItem>
                        <SelectItem value="לא שויך">לא שויך</SelectItem>
                        <SelectItem value="פתוח">פתוח</SelectItem>
                        <SelectItem value="בטיפול">בטיפול</SelectItem>
                        <SelectItem value="הושלם">הושלם</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="md:col-span-2">
                      <Input
                        value={newUpdate}
                        onChange={(e) => setNewUpdate(e.target.value)}
                        placeholder="הוסיפו טקסט לעדכון (אופציונלי)"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddUpdate} className="rounded-xl">הוסף/י עדכון</Button>
                    <Button variant="secondary" onClick={markCompleted} className="rounded-xl">סמן כהושלם</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Form (email to submitter) */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  תגובה לפנייה
                </CardTitle>
                <CardDescription>
                  שלחו תגובה למגיש הפנייה באימייל
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="response" className="hebrew-body">
                    תוכן התגובה
                  </Label>
                  <Textarea
                    id="response"
                    placeholder="כתבו כאן את התגובה שלכם לפנייה..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="mt-2 min-h-32 resize-none hebrew-body"
                    dir="rtl"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!response.trim()) {
                      toast({ title: "שגיאה", description: "אנא כתבו תגובה לפני השליחה", variant: "destructive" });
                      return;
                    }
                    setIsSending(true);
                    setTimeout(() => {
                      toast({
                        title: "התגובה נשלחה",
                        description: `התגובה נשלחה לכתובת ${complaint.submitterEmail || "(לא סופק אימייל)"}`,
                      });
                      setResponse("");
                      setIsSending(false);
                    }, 1000);
                  }}
                  disabled={isSending || !response.trim()}
                  className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all rounded-xl"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {isSending ? "שולח תגובה..." : "שלח תגובה"}
                </Button>
                {complaint.submitterEmail && (
                  <p className="text-xs text-muted-foreground text-center" dir="ltr">
                    התגובה תישלח לכתובת: {complaint.submitterEmail}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פרטי הפנייה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">קטגוריה</label>
                  <p className="hebrew-body font-medium">{complaint.category}</p>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">מגיש הפנייה</label>
                  <p className="hebrew-body font-medium">{complaint.submitter}</p>
                  {complaint.submitterEmail && (
                    <p className="text-sm text-muted-foreground" dir="ltr">{complaint.submitterEmail}</p>
                  )}
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-muted-foreground">תאריך הגשה</label>
                  <p className="hebrew-body font-medium">{complaint.date}</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פעולות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {complaint.status === "לא שויך" && (
                  <Button onClick={handleClaim} className="w-full rounded-xl" variant="secondary">
                    <UserPlus className="w-4 h-4 ml-2" /> שיוך אליי
                  </Button>
                )}
                <Button
                  onClick={markCompleted}
                  disabled={complaint.status === "הושלם"}
                  className="w-full rounded-xl"
                >
                  סמן כהושלם
                </Button>
                <Button
                  onClick={handleDeleteComplaint}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full hover:shadow-lg transition-all rounded-xl"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  {isDeleting ? "מוחק פנייה..." : "מחק פנייה"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  מחיקה תסיר את הפנייה לצמיתות
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetail;
