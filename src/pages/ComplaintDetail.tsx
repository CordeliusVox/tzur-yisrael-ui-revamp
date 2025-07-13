import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  GraduationCap, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle,
  Send,
  Trash2
} from "lucide-react";

// Mock data - in real app this would come from API
const mockComplaintDetails = {
  "1": {
    id: "1",
    title: "בעיה עם הארוחות בקפטריה",
    submitter: "יוסי כהן",
    submitterEmail: "yossi.cohen@email.com",
    category: "שירותי מזון",
    status: "פתוח",
    date: "2024-01-15",
    priority: "גבוה",
    description: "היי, אני רוצה להתלונן על איכות הארוחות בקפטריה. בשבועות האחרונים אני שם לב שהאוכל לא טעים, ההמתנה בתור ארוכה מדי (לפעמים יותר מ-20 דקות), והמחירים עלו משמעותיה. בנוסף, הצוות לא מספיק נחמד ולפעמים אפילו גס. אני מקווה שתטפלו בבעיה כי זה מפריע לכל התלמידים.",
    updates: [
      {
        date: "2024-01-15",
        time: "14:30",
        author: "מערכת",
        message: "פנייה נקלטה במערכת והועברה לטיפול"
      },
      {
        date: "2024-01-16", 
        time: "09:15",
        author: "רחל מנהלת",
        message: "בדקנו את הנושא עם ספק הקפטריה. נחזור אליכם תוך 48 שעות עם עדכון"
      }
    ]
  },
  "2": {
    id: "2",
    title: "רעש בשעות הפסקה",
    submitter: "מרים לוי",
    submitterEmail: "miriam.levi@email.com",
    category: "סביבת למידה",
    status: "סגור",
    date: "2024-01-12",
    priority: "בינוני", 
    description: "ברצוני להתלונן על רעש מופרז במסדרונות בזמן הפסקות. הרעש מפריע לשיעורים ומקשה על הלמידה. אני מבקשת שתטפלו בנושא.",
    updates: [
      {
        date: "2024-01-12",
        time: "11:20",
        author: "מערכת",
        message: "פנייה נקלטה במערכת"
      },
      {
        date: "2024-01-13",
        time: "08:45",
        author: "דני מחנך",
        message: "דיברנו עם התלמידים בכיתות ויישמנו כללי רעש חדשים"
      },
      {
        date: "2024-01-14",
        time: "16:30",
        author: "מרים לוי",
        message: "תודה רבה! יש שיפור משמעותי"
      }
    ]
  }
};

const ComplaintDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [response, setResponse] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const complaint = id ? mockComplaintDetails[id as keyof typeof mockComplaintDetails] : null;

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
    
    // Simulate API call to delete complaint
    setTimeout(() => {
      toast({
        title: "פנייה נמחקה בהצלחה",
        description: "הפנייה הוסרה מהמערכת",
      });
      setIsDeleting(false);
      navigate("/complaints");
    }, 1000);
  };

  const handleSendResponse = async () => {
    if (!response.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא כתבו תגובה לפני השליחה",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    
    // Simulate API call to send email response
    setTimeout(() => {
      toast({
        title: "התגובה נשלחה בהצלחה",
        description: `התגובה נשלחה לכתובת ${complaint.submitterEmail}`,
      });
      setResponse("");
      setIsSending(false);
    }, 2000);
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
                <div className="flex items-start justify-between">
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

            {/* Response Form */}
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
                  onClick={handleSendResponse}
                  disabled={isSending || !response.trim()}
                  className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all rounded-xl"
                >
                  <Send className="w-4 h-4 ml-2" />
                  {isSending ? "שולח תגובה..." : "שלח תגובה"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  התגובה תישלח לכתובת: {complaint.submitterEmail}
                </p>
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
                  <p className="text-sm text-muted-foreground" dir="ltr">{complaint.submitterEmail}</p>
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
              <CardContent>
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
                  פעולה זו תמחק את הפנייה לצמיתות
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