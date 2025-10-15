import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  GraduationCap,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Send,
  Trash2,
  Download,
  Check
} from "lucide-react";

// Shared types
type Complaint = {
  id: string;
  title: string;
  submitter: string;
  submitterEmail?: string;
  submitterPhone?: string;
  category: string;
  date: string;
  description: string;
  assignedTo?: string | null;
  visible: boolean;
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
  const [isFinishing, setIsFinishing] = useState(false);

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

  const handleFinishComplaint = async () => {
    setIsFinishing(true);
    try {
      // Update visibility in database
      const { error } = await supabase
        .from('complaints')
        .update({ visible: false })
        .eq('id', complaint.id);

      if (error) throw error;

      // Update local storage
      const updated: Complaint = {
        ...complaint,
        visible: false,
      };
      saveComplaint(updated);

      toast({
        title: "הפנייה הושלמה",
        description: "הפנייה לא תוצג יותר ברשימה",
      });

      // Navigate back after short delay
      setTimeout(() => {
        navigate("/complaints");
      }, 1000);
    } catch (error) {
      console.error("Error finishing complaint:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בסיום הפנייה",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDownloadComplaint = () => {
    const content = `
דוח פנייה #${complaint.id}
============================

כותרת: ${complaint.title}
קטגוריה: ${complaint.category}
תאריך הגשה: ${complaint.date}
מגיש: ${complaint.submitter}
${complaint.submitterEmail ? `אימייל: ${complaint.submitterEmail}` : ''}
${complaint.submitterPhone ? `טלפון: ${complaint.submitterPhone}` : ''}
${complaint.assignedTo ? `מטפל: ${complaint.assignedTo}` : ''}

תיאור הפנייה:
${complaint.description}

דוח נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `complaint_${complaint.id}_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "הדוח הורד בהצלחה",
      description: "קובץ הדוח נשמר במחשב שלך"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted rtl">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
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
                    {complaint.submitterEmail}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submitter Details */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פרטי המגיש</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">שם: </span>
                  <span className="font-medium">{complaint.submitter}</span>
                </div>
                {complaint.submitterEmail && (
                  <div>
                    <span className="text-muted-foreground">אימייל: </span>
                    <span className="font-medium">{complaint.submitterEmail}</span>
                  </div>
                )}
                {complaint.submitterPhone && (
                  <div>
                    <span className="text-muted-foreground">טלפון: </span>
                    <span className="font-medium">{complaint.submitterPhone}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">קטגוריה: </span>
                  <span className="font-medium">{complaint.category}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle">פעולות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleDownloadComplaint}
                  variant="outline"
                  className="w-full justify-start rounded-xl"
                >
                  <Download className="w-4 h-4 ml-2" />
                  הורד דוח מלא
                </Button>

                <Button
                  onClick={handleFinishComplaint}
                  disabled={isFinishing}
                  className="w-full justify-start rounded-xl bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 ml-2" />
                  {isFinishing ? "מסיים..." : "סיים פנייה"}
                </Button>

                <Separator />

                <Button
                  onClick={handleDeleteComplaint}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full justify-start rounded-xl"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  {isDeleting ? "מוחק..." : "מחק לצמיתות"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetail;
