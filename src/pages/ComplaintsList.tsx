// COMPLETE FIX for ComplaintsList.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Settings, LogOut, Search, User, RefreshCw, Calendar, Tag } from 'lucide-react';
import { getComplaintAge, getComplaintCardClass, sortComplaintsByPriority, formatTimeAgo, type ComplaintWithAge } from '@/utils/complaintUtils';

// Local storage keys
const STORAGE_KEY = "complaints_v1";
const CACHE_KEY = "complaints_cache";
const CACHE_TIMESTAMP_KEY = "complaints_cache_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Updated status options (only 3 statuses)
const STATUS_OPTIONS = ['לא שויך', 'בטיפול', 'הושלם'] as const;

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintWithAge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [userAssignedCategories, setUserAssignedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('הכל');
  const [statusFilter, setStatusFilter] = useState('הכל');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingUserCategories, setLoadingUserCategories] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const complaintsPerPage = 25;
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .order('name');

        if (error) throw error;
        const categoryNames = data?.map(c => c.name) || [];
        console.log('Loaded categories from DB:', categoryNames);
        setCategories(categoryNames);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  // Load user's assigned categories - FIXED VERSION
  useEffect(() => {
    const loadUserCategories = async () => {
      if (!user?.email) {
        setUserAssignedCategories([]);
        setLoadingUserCategories(false);
        return;
      }

      setLoadingUserCategories(true);
      try {
        const { supabase } = await import('@/integrations/supabase/client');

        // Get profile by email - use the profile ID (not user_id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setUserAssignedCategories([]);
          setLoadingUserCategories(false);
          return;
        }

        if (!profileData) {
          console.log('No profile found for user email:', user.email);
          setUserAssignedCategories([]);
          setLoadingUserCategories(false);
          return;
        }

        console.log('Found profile ID:', profileData.id);

        // Query user_categories using the profile ID
        const { data, error } = await supabase
          .from('user_categories')
          .select('categories(name)')
          .eq('user_id', profileData.id);

        if (error) {
          console.error('Error loading user categories:', error);
          setUserAssignedCategories([]);
          setLoadingUserCategories(false);
          return;
        }

        const assignedCats = data?.map((uc: any) => uc.categories?.name).filter(Boolean) || [];
        console.log('✅ User assigned categories:', assignedCats);
        setUserAssignedCategories(assignedCats);
      } catch (error) {
        console.error('Error loading user categories:', error);
        setUserAssignedCategories([]);
      } finally {
        setLoadingUserCategories(false);
      }
    };

    loadUserCategories();
  }, [user]);

  // Load from cache immediately on mount
  useEffect(() => {
    if (user) {
      loadComplaintsWithCache();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  // Normalize status to one of the 3 allowed statuses
  const normalizeStatus = (status: string): typeof STATUS_OPTIONS[number] => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('בטיפול') || lowerStatus.includes('פתוח') || lowerStatus.includes('claimed')) {
      return 'בטיפול';
    }
    if (lowerStatus.includes('הושלם') || lowerStatus.includes('completed') || lowerStatus.includes('סגור')) {
      return 'הושלם';
    }
    return 'לא שויך';
  };

  // Normalize category with fuzzy matching
  const normalizeCategory = (category: string): string => {
    if (!category) return 'אחר';

    const normalized = category.trim();

    // Exact match
    if (categories.includes(normalized)) {
      return normalized;
    }

    // Fuzzy match (case-insensitive, whitespace-insensitive)
    const match = categories.find(cat => 
      cat.toLowerCase().replace(/\s+/g, '') === normalized.toLowerCase().replace(/\s+/g, '')
    );

    if (match) {
      console.log(`Category fuzzy matched: "${normalized}" -> "${match}"`);
      return match;
    }

    console.warn(`⚠️ Category not found in database: "${normalized}". Available:`, categories);
    return normalized;
  };

  const loadFromCache = (): ComplaintWithAge[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        return parsedData.map((complaint: any) => {
          const { age, daysOld } = getComplaintAge(complaint.created_at, complaint.status);
          return { 
            ...complaint, 
            age, 
            daysOld,
            status: normalizeStatus(complaint.status),
            category: normalizeCategory(complaint.category)
          };
        });
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
    }
    return null;
  };

  const saveToCache = (data: any[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const loadComplaintsWithCache = async () => {
    const cachedData = loadFromCache();
    if (cachedData && cachedData.length > 0) {
      setComplaints(cachedData);
      setLoading(false);

      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp, 10);
        if (age > CACHE_DURATION) {
          fetchComplaintsInBackground();
        }
      }
    } else {
      await loadComplaints();
    }
  };

  const fetchComplaintsInBackground = async () => {
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to fetch complaints");

      const complaintsData = await response.json();
      const complaintsWithAge = processComplaints(complaintsData);

      if (JSON.stringify(complaintsWithAge) !== JSON.stringify(complaints)) {
        setComplaints(complaintsWithAge);
        saveToCache(complaintsData);
        saveComplaintsForDetailPage(complaintsData);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Background fetch error:", error);
      }
    }
  };

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to fetch complaints");

      const complaintsData = await response.json();
      const complaintsWithAge = processComplaints(complaintsData);

      setComplaints(complaintsWithAge);
      saveToCache(complaintsData);
      saveComplaintsForDetailPage(complaintsData);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: "הבקשה בוטלה",
          description: "זמן הטעינה ארך מדי, נסה שוב",
          variant: "destructive",
        });
      } else {
        console.error("Error loading complaints:", error);
        toast({
          title: "שגיאה",
          description: "נכשל בטעינת התלונות",
          variant: "destructive",
        });
      }

      const cachedData = loadFromCache();
      if (cachedData) {
        setComplaints(cachedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const processComplaints = (complaintsData: any[]): ComplaintWithAge[] => {
    console.log('Processing complaints with categories:', categories);
    
    const complaintsWithAge = complaintsData.map((complaint: any) => {
      const normalizedStatus = normalizeStatus(complaint.status);
      const normalizedCategory = normalizeCategory(complaint.category);
      const { age, daysOld } = getComplaintAge(complaint.created_at, normalizedStatus);

      if (complaint.category !== normalizedCategory) {
        console.log(`📝 Category mapped: "${complaint.category}" -> "${normalizedCategory}"`);
      }

      return {
        ...complaint,
        status: normalizedStatus,
        category: normalizedCategory,
        age,
        daysOld,
        submitter_id: complaint.submitter_id || "external",
      };
    });
    return sortComplaintsByPriority(complaintsWithAge);
  };

  const saveComplaintsForDetailPage = (complaintsData: any[]) => {
    const complaintsForStorage = complaintsData.map((complaint: any) => ({
      id: complaint.id,
      title: complaint.title || "לא נמצא כותרת",
      submitter: complaint.name || "לא ידוע",
      submitterEmail: complaint.email || "לא נמצא אימייל",
      submitterPhone: complaint.phone || "לא נמצא מספר טלפון",
      category: normalizeCategory(complaint.category),
      status: normalizeStatus(complaint.status),
      date: complaint.created_at,
      description: complaint.details,
      assignedTo: complaint.assigned_to,
      updates: [],
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaintsForStorage));
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        "https://daxknkbmetzajmgdpniz.supabase.co/functions/v1/sync-google-sheets?refresh=true",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const complaintsData = await response.json();
        const complaintsWithAge = processComplaints(complaintsData);
        setComplaints(complaintsWithAge);
        saveToCache(complaintsData);
        saveComplaintsForDetailPage(complaintsData);

        toast({
          title: "עודכן בהצלחה",
          description: "הרשימה עודכנה מהשרת",
        });
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון הרשימה",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  // FIXED FILTERING LOGIC
  const filteredComplaints = useMemo(() => {
    console.log('=== FILTERING DEBUG ===');
    console.log('Total complaints:', complaints.length);
    console.log('User assigned categories:', userAssignedCategories);
    console.log('Loading user categories:', loadingUserCategories);
    console.log('All available categories in DB:', categories);
    
    return complaints.filter((complaint) => {
      const description = complaint.description || (complaint as any).details || "";
      const matchesSearch =
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase());

      // CRITICAL FIX: Handle category filtering properly
      let matchesUserCategories = true;
      
      if (loadingUserCategories) {
        // Still loading, show nothing
        return false;
      } else if (userAssignedCategories.length > 0) {
        // User has specific categories - only show those
        matchesUserCategories = userAssignedCategories.includes(complaint.category);
        
        if (!matchesUserCategories) {
          console.log(`❌ Filtered out: "${complaint.title}" - category "${complaint.category}" not in [${userAssignedCategories.join(', ')}]`);
        }
      } else {
        // No categories assigned = admin/owner = show all
        console.log('ℹ️ No categories assigned to user - showing all complaints (admin mode)');
      }

      const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter;

      const result = matchesSearch && matchesCategory && matchesStatus && matchesUserCategories;
      
      return result;
    });
  }, [complaints, searchTerm, categoryFilter, statusFilter, userAssignedCategories, loadingUserCategories, categories]);

  // Get available categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (userAssignedCategories.length === 0) {
      return categories; // Show all if no restrictions
    }
    return categories.filter(cat => userAssignedCategories.includes(cat));
  }, [categories, userAssignedCategories]);

  const totalPages = Math.ceil(filteredComplaints.length / complaintsPerPage);
  const paginatedComplaints = useMemo(() => {
    return filteredComplaints.slice(
      (currentPage - 1) * complaintsPerPage,
      currentPage * complaintsPerPage
    );
  }, [filteredComplaints, currentPage, complaintsPerPage]);

  const handleClaim = useCallback((id: string) => {
    const updatedComplaints = complaints.map((complaint) => {
      if (complaint.id === id && complaint.status === "לא שויך") {
        return {
          ...complaint,
          assigned_to: user?.id,
          status: "בטיפול" as const,
        };
      }
      return complaint;
    });

    setComplaints(updatedComplaints);
    saveToCache(updatedComplaints);

    toast({
      title: "התלונה נתפסה",
      description: "התלונה הוקצתה אליך בהצלחה",
    });
  }, [complaints, user, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "לא שויך": { variant: "secondary" as const, text: "לא שויך", color: "bg-red-100 text-red-800" },
      "בטיפול": { variant: "default" as const, text: "בטיפול", color: "bg-yellow-100 text-yellow-800" },
      "הושלם": { variant: "default" as const, text: "הושלם", color: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["לא שויך"];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'פדגוגיה': <User className="h-3 w-3" />,
      'מחשוב': <Settings className="h-3 w-3" />,
      'תשתיות': <Settings className="h-3 w-3" />,
      'ביטחון אישי': <Settings className="h-3 w-3" />
    };

    return iconMap[category] || <Tag className="h-3 w-3" />;
  };

  const getUserDisplay = (userId: string) => {
    if (userId === user?.id) return "אתה";
    return "משתמש אחר";
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Loading states
  if (loading && complaints.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg hebrew-body">טוען תלונות...</div>
        </div>
      </div>
    );
  }

  if (loadingUserCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg hebrew-body">טוען הרשאות משתמש...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="card-elegant mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold text-primary hebrew-title">
                רשימת פניות
                {userAssignedCategories.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground mr-2">
                    (מסננת לפי: {userAssignedCategories.join(', ')})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings")}
                >
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
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {paginatedComplaints.length === 0 ? (
            <div className="col-span-full">
              <Card className="card-elegant">
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground hebrew-body">לא נמצאו תלונות</p>
                  {userAssignedCategories.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      אתה משויך לקטגוריות: {userAssignedCategories.join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            paginatedComplaints.map((complaint) => (
              <Card
                key={complaint.id}
                className={`card-elegant cursor-pointer transition-all hover:shadow-lg ${getComplaintCardClass(
                  complaint.age
                )}`}
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg hebrew-subtitle line-clamp-2 mb-2">
                        {complaint.title || "כותרת לא נמצאה"}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {(complaint as any).name || "מגיש לא ידוע"}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex gap-2 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {complaint.status === "לא שויך" && (
                        <Button
                          size="sm"
                          onClick={() => handleClaim(complaint.id)}
                          className="btn-secondary"
                        >
                          תפוס
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(complaint.status)}
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getCategoryIcon(complaint.category)}
                      {complaint.category}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-4 hebrew-body line-clamp-2">
                    {truncateText(complaint.description || (complaint as any).details || "אין תיאור זמין", 100)}
                  </p>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimeAgo(complaint.created_at)}</span>
                      </div>
                      {complaint.assigned_to && (
                        <span className="text-xs">
                          מטופל על ידי: {getUserDisplay(complaint.assigned_to)}
                        </span>
                      )}
                    </div>
                    {complaint.daysOld !== undefined && (
                      <div className="text-xs">
                        <span className={complaint.daysOld > 7 ? "text-red-600 font-medium" : ""}>
                          {complaint.daysOld} ימים מאז הגשה
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}