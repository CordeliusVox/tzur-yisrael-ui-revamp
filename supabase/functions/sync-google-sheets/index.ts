import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { google } from "npm:googleapis@118.0.0";

// CONFIG
const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";

// Map Hebrew/English field names → normalized keys
const FIELD_MAP: Record<string, string> = {
  "Timestamp": "timestamp",
  "Email Address": "email",

  "מגיש הפנייה": "submitter",
  "תפקיד": "role",
  "מחלקה": "department",
  "שם פונה (שם פרטי + שם משפחה)": "name",
  "מספר טלפון": "phone",
  "נושא הפנייה": "topic",
  "כותרת הפנייה": "title",   // if correct spelling exists
  "כתורת הפנייה": "title",   // typo version
  "פרטי הפנייה": "details",
  "שכבה": "gradeLevel",
  "כיתה": "class",
};

async function fetchComplaints() {
  try {
    console.log("Starting to fetch complaints from Google Sheets...");

    const googleJsonKey = Deno.env.get("GOOGLE_KEY");
    if (!googleJsonKey) {
      throw new Error("GOOGLE_JSON_KEY environment variable is not set");
    }

    const credentials = JSON.parse(googleJsonKey);
    console.log("Credentials parsed successfully");

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    console.log("Google Sheets client created");

    // Try to fetch values
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    console.log("Successfully retrieved data from Google Sheets");
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in sheet");
      return [];
    }

    const headers = rows[0];
    console.log("Headers from sheet:", headers);
    const dataRows = rows.slice(1);

    const complaints = dataRows.map((row, idx) => {
      const entry: Record<string, string> = {};

      // Assign first non-empty occurrence for each mapped field
      headers.forEach((header, i) => {
        const key = FIELD_MAP[header];
        if (key && !entry[key]) {
          entry[key] = row[i] || "";
        }
      });

      return {
        id: (idx + 1).toString(),
        timestamp: entry.timestamp || "",
        submitter: entry.submitter || "",
        role: entry.role || "",
        department: entry.department || "",
        name: entry.name || "",
        phone: entry.phone || "",
        topic: entry.topic || "",
        title: entry.title || "",
        details: entry.details || "",
        gradeLevel: entry.gradeLevel || "",
        class: entry.class || "",
        email: entry.email || "",
        status: "חדש",
        category: entry.topic || "כללי",
        submitter_id: "external",
        created_at: entry.timestamp || new Date().toISOString(),
        updated_at: entry.timestamp || new Date().toISOString(),
      };
    });

    return complaints.filter((c) => c.title || c.details);
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return [];
  }
}

// Serve HTTP requests
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase client to verify JWT
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } }
  });

  // Verify user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user has admin or staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const complaints = await fetchComplaints();
  
  // Redact sensitive PII for non-admin users
  const filteredComplaints = profile.role === 'admin' 
    ? complaints 
    : complaints.map(complaint => ({
        ...complaint,
        name: '[REDACTED]',
        phone: '[REDACTED]',
        email: '[REDACTED]'
      }));

  return new Response(JSON.stringify(filteredComplaints), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
