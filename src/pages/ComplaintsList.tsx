import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, GraduationCap, LogOut, Eye, Calendar, User, FileText } from "lucide-react";

// Mock data for complaints
const mockComplaints = [
  {
    id: "1",
    title: "בעיה עם הארוחות בקפטריה",
    submitter: "יוסי כהן",
    category: "שירותי מזון",
    status: "פתוח",
    date: "2024-01-15",
    priority: "גבוה",
    description: "איכות הארוחות ירודה וההמתנה ארוכה מדי..."
  },
  {
    id: "2", 
    title: "רעש בשעות הפסקה",
    submitter: "מרים לוי",
    category: "סביבת למידה",
    status: "סגור",
    date: "2024-01-12",
    priority: "בינוני",
    description: "רעש מופרז במסדרונות המפריע לשיעורים..."
  },
  {
    id: "3",
    title: "בעיות עם מערכת המחשבים",
    submitter: "דוד אברהם",
    category: "טכנולוגיה",
    status: "פתוח",
    date: "2024-01-10",
    priority: "דחוף",
    description: "מחשבים לא עובדים במעבדה..."
  },
  {
    id: "4",
    title: "חוסר ניקיון בחדרי השירותים",
    submitter: "שרה מזרחי",
    category: "ניקיון",
    status: "פתוח", 
    date: "2024-01-08",
    priority: "גבוה",
    description: "חדרי השירותים לא מנוקים כראוי..."
  }
];

const ComplaintsList = () => {
  const [complaints] = useState(mockComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");
  const navigate = useNavigate();

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.title.includes(searchTerm) || 
                         complaint.submitter.includes(searchTerm) ||
                         complaint.description.includes(searchTerm);
    const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
    const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleLogout = () => {
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    if (status === "פתוח") {
      return <Badge className="status-open">פתוח</Badge>;
    }
    return <Badge className="status-closed">סגור</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "דחוף": return "text-red-600 font-semibold";
      case "גבוה": return "text-orange-600 font-medium";
      case "בינוני": return "text-yellow-600";
      default: return "text-muted-foreground";
    }
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
              מצאו פניות לפי נושא, מגיש או תוכן
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
                  <SelectItem value="פתוח">פתוח</SelectItem>
                  <SelectItem value="סגור">סגור</SelectItem>
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
          <div className="text-sm text-muted-foreground">
            מעודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}
          </div>
        </div>

        {/* Complaints Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredComplaints.map((complaint) => (
            <Card key={complaint.id} className="card-elegant cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
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
                  {getStatusBadge(complaint.status)}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">קטגוריה:</span>
                    <span className="font-medium">{complaint.category}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">עדיפות:</span>
                    <span className={getPriorityColor(complaint.priority)}>
                      {complaint.priority}
                    </span>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 hebrew-body">
                      {complaint.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <Button 
                      onClick={() => navigate(`/complaint/${complaint.id}`)}
                      className="w-full bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg transition-all rounded-xl"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      צפייה בפרטים
                    </Button>
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