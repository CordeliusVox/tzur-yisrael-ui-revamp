import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  GraduationCap, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  MessageSquare
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
  const [isClosing, setIsClosing] = useState(false);
  
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

  const handleCloseComplaint = async () => {
    setIsClosing(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "פנייה נסגרה בהצלחה",
        description: "הפנייה סומנה כסגורה במערכת",
      });
      setIsClosing(false);
      navigate("/complaints");
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    if (status === "פתוח") {
      return <Badge className="status-open flex items-center gap-1">
        <Clock className="w-3 h-3" />
        פתוח
      </Badge>;
    }
    return <Badge className="status-closed flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      סגור
    </Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "דחוף": return "text-red-600 bg-red-50 border-red-200";
      case "גבוה": return "text-orange-600 bg-orange-50 border-orange-200";
      case "בינוני": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-muted-foreground bg-muted border-border";
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
                  {getStatusBadge(complaint.status)}
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

            {/* Updates Timeline */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="hebrew-subtitle flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  עדכונים וטיפול
                </CardTitle>
                <CardDescription>
                  היסטוריית הטיפול בפנייה
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complaint.updates.map((update, index) => (
                    <div key={index} className="relative">
                      {index !== complaint.updates.length - 1 && (
                        <div className="absolute right-2 top-8 bottom-0 w-0.5 bg-border"></div>
                      )}
                      <div className="flex gap-4">
                        <div className="w-4 h-4 bg-primary rounded-full mt-1 relative z-10"></div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{update.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {update.date} • {update.time}
                            </span>
                          </div>
                          <p className="text-sm hebrew-body text-foreground">
                            {update.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <label className="text-sm font-medium text-muted-foreground">עדיפות</label>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority}
                  </div>
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
            {complaint.status === "פתוח" && (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="hebrew-subtitle">פעולות</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleCloseComplaint}
                    disabled={isClosing}
                    className="w-full bg-gradient-to-l from-success to-success/90 hover:shadow-lg transition-all rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    {isClosing ? "סוגר פנייה..." : "סמן כסגור"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    פעולה זו תסמן את הפנייה כטופלה
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetail;