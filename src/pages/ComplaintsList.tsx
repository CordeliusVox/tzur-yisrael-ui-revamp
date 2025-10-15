// Replace the loadUserCategories useEffect with this fixed version:

useEffect(() => {
  const loadUserCategories = async () => {
    if (!user?.email) {
      console.log('No user email found');
      setUserAssignedCategories([]);
      return;
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('Loading categories for user email:', user.email);
      
      // Get profile by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single(); // Use single() instead of maybeSingle() to catch errors
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setUserAssignedCategories([]);
        return;
      }

      if (!profileData) {
        console.log('No profile found for user email:', user.email);
        setUserAssignedCategories([]);
        return;
      }

      console.log('Found profile ID:', profileData.id);

      // Fetch user categories with proper join
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('user_categories')
        .select(`
          category_id,
          categories!inner (
            id,
            name
          )
        `)
        .eq('user_id', profileData.id);

      if (categoriesError) {
        console.error('Error loading user categories:', categoriesError);
        setUserAssignedCategories([]);
        return;
      }

      // Extract category names
      const assignedCats = categoriesData
        ?.map((uc: any) => uc.categories?.name)
        .filter(Boolean) || [];
      
      console.log('User assigned categories:', assignedCats);
      
      // Important: Only set categories if we actually found some
      // If the user has no categories assigned, they shouldn't see anything
      if (assignedCats.length === 0) {
        console.warn('User has no assigned categories - will see no complaints');
      }
      
      setUserAssignedCategories(assignedCats);
    } catch (error) {
      console.error('Error loading user categories:', error);
      setUserAssignedCategories([]);
    }
  };

  loadUserCategories();
}, [user]);

// Also update the filteredComplaints useMemo to be more strict:

const filteredComplaints = useMemo(() => {
  console.log('Filtering complaints. User categories:', userAssignedCategories);
  console.log('Total complaints:', complaints.length);
  
  return complaints.filter((complaint) => {
    const description = complaint.description || (complaint as any).details || "";
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // CRITICAL FIX: If user has no assigned categories, they should see NOTHING
    // Only show complaints if the user has that specific category assigned
    const matchesUserCategories = userAssignedCategories.length > 0 && 
      userAssignedCategories.includes(complaint.category);
    
    console.log(`Complaint ${complaint.id} - Category: ${complaint.category}, Matches: ${matchesUserCategories}`);
    
    const matchesCategory = categoryFilter === "הכל" || complaint.category === categoryFilter;
    const matchesStatus = statusFilter === "הכל" || complaint.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesUserCategories;
  });
}, [complaints, searchTerm, categoryFilter, statusFilter, userAssignedCategories]);

// Update the availableCategories useMemo to only show assigned categories:

const availableCategories = useMemo(() => {
  // Only show categories that are assigned to this user
  if (userAssignedCategories.length === 0) {
    return []; // No categories to show if none assigned
  }
  return categories.filter(cat => userAssignedCategories.includes(cat));
}, [categories, userAssignedCategories]);

// Add a helpful message when user has no assigned categories:
// Add this after the filters Card and before the complaints list:

{userAssignedCategories.length === 0 && (
  <Card className="card-elegant mb-6">
    <CardContent className="py-8 text-center">
      <p className="text-muted-foreground hebrew-body">
        לא הוקצו לך קטגוריות. אנא פנה למנהל המערכת.
      </p>
    </CardContent>
  </Card>
)}
