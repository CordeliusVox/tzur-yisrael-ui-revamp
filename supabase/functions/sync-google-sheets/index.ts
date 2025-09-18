import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@118.0.0";

const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";

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
  "כתורת הפנייה": "title",
  "פרטי הפנייה": "details",
  "שכבה": "gradeLevel",
  "כיתה": "class",
};

// In-memory cache
let cache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchFromSheets() {
  const googleJsonKey = Deno.env.get("GOOGLE_KEY");
  if (!googleJsonKey) throw new Error("GOOGLE_KEY not set");

  const credentials = JSON.parse(googleJsonKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  const complaints = rows.slice(1).map((row, idx) => {
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

async function getComplaints() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }
  const fresh = await fetchFromSheets();
  cache = { data: fresh, timestamp: now };
  return fresh;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const complaints = await getComplaints();
    return new Response(JSON.stringify(complaints), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
