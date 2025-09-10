import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { google } from "npm:googleapis@118.0.0";

const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";

const FIELD_MAP: Record<string, string> = {
  Timestamp: "timestamp",
  "Email Address": "email",
  "מגיש הפנייה": "submitter",
  תפקיד: "role",
  מחלקה: "department",
  "שם פונה (שם פרטי + שם משפחה)": "name",
  "מספר טלפון": "phone",
  "נושא הפנייה": "topic",
  "כותרת הפנייה": "title",
  "כתורת הפנייה": "title", // typo version
  "פרטי הפנייה": "details",
  שכבה: "gradeLevel",
  כיתה: "class",
};

// In-memory cache
let cachedComplaints: any[] | null = null;
let lastFetch = 0;

async function fetchComplaints() {
  console.log("Fetching complaints from Google Sheets...");

  const googleKey = Deno.env.get("GOOGLE_KEY");
  if (!googleKey) {
    throw new Error("GOOGLE_KEY environment variable is not set");
  }

  const credentials = JSON.parse(googleKey);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const complaints = dataRows.map((row, idx) => {
    const entry: Record<string, string> = {};
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
}

async function getComplaintsCached() {
  const now = Date.now();
  if (cachedComplaints && now - lastFetch < 60_000) {
    return cachedComplaints;
  }
  const fresh = await fetchComplaints();
  cachedComplaints = fresh;
  lastFetch = now;
  return fresh;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify auth header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  // Verify user & profile
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("role").eq("user_id", user?.id).single(),
  ]);

  if (!user || !profile) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!["admin", "staff"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const complaints = await getComplaintsCached();
    return new Response(JSON.stringify(complaints), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
