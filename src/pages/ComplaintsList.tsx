import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Settings, LogOut, Search, User } from "lucide-react";
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge } from "@/utils/complaintUtils";

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintWithAge[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");
  const [loading, setLoading] = useState(true);

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadComplaints();
    }
  }, [user]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://your-backend-url.com", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch complaints");

      const complaintsData = await response.json();

      const complaintsWithAge = complaintsData.map((complaint: any) => {
        const { age, daysOld } = getComplaintAge(complaint.created_at, complaint.status);
        return {
          ...complaint,
          age,
          daysOld,
          submitter_id: complaint.submitter_id || "external",
        };
      });

      setComplaints(sortComplaintsByPriority(complaintsWithAge));
    } catch (error) {
      console.error("Error loading complaints:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת התלונות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const description = complaint.description || (complaint as any).details || "";
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [complaints, searchTerm, categoryFilter, statusFilter]);

  const handleClaim = (id: string) => {
    const updated = complaints.map((complaint) =>
      complaint.id === id && complaint.status === "לא שויך"
        ? { ...complaint, assigned_to: user?.id, status: "בטיפול" as const }
        : complaint
    );
    setComplaints(updated);

    toast({
      title: "התלונה נתפסה",
      description: "התלונה הוקצתה אליך בהצלחה",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "לא שויך": { variant: "secondary" as const, text: "לא שויך" },
      "פתוח": { variant: "default" as const, text: "פתוח" },
      "בטיפול": { variant: "default" as const, text: "בטיפול" },
      "הושלם": { variant: "default" as const, text: "הושלם" },
      "חדש": { variant: "default" as const, text: "חדש" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["לא שויך"];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getUserDisplay = (userId: string) => {
    if (userId === user?.id) return "אתה";
    return "משתמש אחר";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg hebrew-body">טוען תלונות...</div>
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const complaint = filteredComplaints[index];
    return (
      <div style={style}>
        <Card
          key={complaint.id}
          className={`card-elegant cursor-pointer ${getComplaintCardClass(complaint.age)}`}
          onClick={() => navigate(`/complaint/${complaint.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg hebrew-subtitle line-clamp-1">
                {complaint.title}
              </CardTitle>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {complaint.status === "לא שויך" && (
                  <Button size="sm" onClick={() => handleClaim(complaint.id)} className="btn-secondary">
                    תפוס
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(complaint.status)}
              <Badge variant="outline">{complaint.category}</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <p className="text-muted-foreground mb-4 hebrew-body line-clamp-3">
              {complaint.description || (complaint as any).details}
            </p>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>מגיש: {getUserDisplay(complaint.submitter_id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{formatTimeAgo(complaint.created_at)}</span>
                {complaint.assigned_to && (
                  <span className="text-xs">מטופל על ידי: {getUserDisplay(complaint.assigned_to)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="card-elegant mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold text-primary hebrew-title">רשימת תלונות</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4 ml-2" />
                  הגדרות
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 ml-2" />
                  התנתק
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="card-elegant mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="חפש תלונות ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  <SelectItem value="טכני">טכני</SelectItem>
                  <SelectItem value="ניקיון">ניקיון</SelectItem>
                  <SelectItem value="בטיחות">בטיחות</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  <SelectItem value="לא שויך">לא שויך</SelectItem>
                  <SelectItem value="פתוח">פתוח</SelectItem>
                  <SelectItem value="בטיפול">בטיפול</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                  <SelectItem value="חדש">חדש</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Virtualized Complaints List */}
        <List
          height={600}
          itemCount={filteredComplaints.length}
          itemSize={250}
          width="100%"
          className="mb-6"
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
