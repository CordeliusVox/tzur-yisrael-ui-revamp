import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@118.0.0";

// CONFIG
const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";
const CACHE_DURATION = 60 * 1000; // 1 minute cache
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "your-secret-key";

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
  "כותרת הפנייה": "title",
  "כתורת הפנייה": "title", // typo version
  "פרטי הפנייה": "details",
  "שכבה": "gradeLevel",
  "כיתה": "class",
};

// Category mapping function
function mapToCategory(topic: string): string {
  if (!topic) return "אחר";
  
  const topicLower = topic.toLowerCase();
  
  // Define category keywords
  const categoryMappings: Record<string, string[]> = {
    "פדגוגיה": ["פדגוג", "לימוד", "שיעור", "מבחן", "ציון", "תעודה", "בגרות"],
    "מחשוב": ["מחשב", "אינטרנט", "תוכנה", "מדפסת", "טכני", "IT", "רשת", "וויפי", "wifi"],
    "יחס ממפקדים": ["מפקד", "סמל", "קצין", "מ״כ", "מ\"כ", "מ״פ", "מ\"פ"],
    "יחס ממורים": ["מורה", "מדריך", "מרצה", "מחנך"],
    "תשתיות": ["בניין", "כיתה", "מזגן", "חשמל", "אינסטלציה", "תחזוקה", "ניקיון", "שירותים", "מתקן"],
    "ביטחון אישי": ["בטחון", "בטיחות", "גניבה", "אבידה", "אלימות", "הטרדה", "בריונות"],
    "משמעת": ["משמעת", "עונש", "ריתוק", "איחור", "היעדרות", "חופש", "יציאה"],
    "חדר אוכל": ["אוכל", "ארוחה", "מטבח", "כשרות", "תזונה", "חדר אוכל"],
    "אפסנאות": ["מדים", "ציוד", "נעליים", "בגדים", "אפסנאי"],
    "מרכז משאבים": ["משאב", "ספריה", "השאלה", "ציוד לימודי"],
    "משרד רישום": ["רישום", "מסמך", "אישור", "תעודת", "טופס", "בירוקרטיה"],
  };
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (topicLower.includes(keyword)) {
        return category;
      }
    }
  }
  
  return "אחר";
}

// Cache mechanism
let cachedData: any[] | null = null;
let cacheTimestamp = 0;
let googleAuthClient: any = null;

// Initialize Google Auth once
async function initGoogleAuth() {
  if (googleAuthClient) return googleAuthClient;
  
  const googleJsonKey = Deno.env.get("GOOGLE_KEY");
  if (!googleJsonKey) {
    throw new Error("GOOGLE_JSON_KEY environment variable is not set");
  }
  
  const credentials = JSON.parse(googleJsonKey);
  googleAuthClient = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  
  return googleAuthClient;
}

async function fetchComplaints(forceRefresh = false) {
  try {
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log("Returning cached data");
      return cachedData;
    }

    console.log("Fetching fresh data from Google Sheets...");
    
    const auth = await initGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    
    // Parallel fetch with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timeout")), 10000)
    );
    
    const fetchPromise = sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });
    
    const res = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in sheet");
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Process data more efficiently
    const complaints = dataRows
      .map((row, idx) => {
        const entry: Record<string, string> = {};
        
        // Use a single loop with early exits
        for (let i = 0; i < headers.length; i++) {
          const key = FIELD_MAP[headers[i]];
          if (key && row[i]) {
            entry[key] = row[i];
          }
        }
        
        // Skip empty entries early
        if (!entry.title && !entry.details) return null;
        
        const timestamp = entry.timestamp || new Date().toISOString();
        
        return {
          id: `complaint-${idx + 1}`,
          timestamp,
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
          status: "לא שויך",  // All new complaints start as "לא שויך"
          category: mapToCategory(entry.topic || entry.title || entry.details),
          submitter_id: "external",
          created_at: timestamp,
          updated_at: timestamp,
        };
      })
      .filter(Boolean); // Remove null entries

    // Update cache
    cachedData = complaints;
    cacheTimestamp = now;
    
    console.log(`Cached ${complaints.length} complaints`);
    return complaints;
    
  } catch (error) {
    console.error("Error fetching complaints:", error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      console.log("Returning stale cache due to error");
      return cachedData;
    }
    
    return [];
  }
}

// Serve HTTP requests
serve(async (req) => {
  const url = new URL(req.url);
  
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret",
  };
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Webhook endpoint to invalidate cache
    if (url.pathname === "/webhook" && req.method === "POST") {
      const secret = req.headers.get("X-Webhook-Secret");
      if (secret === WEBHOOK_SECRET) {
        cachedData = null; // Invalidate cache
        console.log("Cache invalidated via webhook");
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    
    // Force refresh endpoint (optional)
    const forceRefresh = url.searchParams.get("refresh") === "true";
    
    const complaints = await fetchComplaints(forceRefresh);
    
    return new Response(JSON.stringify(complaints), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // Browser caching
      },
    });
    
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
