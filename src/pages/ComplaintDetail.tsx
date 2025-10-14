import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  GraduationCap,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Download,
  Tag,
  Mail,
  Phone
} from "lucide-react";

type Complaint = {
  id: string;
  title: string;
  submitter: string;
  submitterEmail?: string;
  submitterPhone?: string;
  category: string;
  date: string;
  description: string;
};

const STORAGE_KEY = "complaints_v1";

const ComplaintDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);

  // Load from storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list: Complaint[] = saved ? (() => { try { return JSON.parse(saved); } catch { return []; } })() : [];
    const c = list.find((x) => x.id === id);
    setComplaint(c ?? null);
  }, [id]);

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
                  <Badge variant="outline" className="shrink-0">
                    <Tag className="w-3 h-3 ml-1" />
                    {complaint.category}
                  </Badge>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle text-base">פרטי התקשרות</CardTitle>
                <CardDescription>מידע על מגיש הפנייה</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">שם</div>
                    <div className="hebrew-body">{complaint.submitter}</div>
                  </div>
                </div>
                
                {complaint.submitterEmail && (
                  <div className="flex items-start gap-2 text-sm">
                    <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">אימייל</div>
                      <div className="hebrew-body" dir="ltr">{complaint.submitterEmail}</div>
                    </div>
                  </div>
                )}
                
                {complaint.submitterPhone && (
                  <div className="flex items-start gap-2 text-sm">
                    <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">טלפון</div>
                      <div className="hebrew-body" dir="ltr">{complaint.submitterPhone}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle text-base">פעולות</CardTitle>
                <CardDescription>אפשרויות זמינות לפנייה</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={handleDownloadComplaint} 
                  variant="outline" 
                  className="w-full justify-start gap-2 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  הורד דוח
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