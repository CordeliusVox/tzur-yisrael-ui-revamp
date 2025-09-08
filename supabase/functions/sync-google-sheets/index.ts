import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "https://cdn.skypack.dev/googleapis@105.0.0";

// CONFIG
const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";

// Map Hebrew field names → normalized keys
const FIELD_MAP: Record<string,string> = {
  "חותמת זמן": "timestamp",
  "מגיש הפנייה": "submitter",
  "תפקיד": "role",
  "מחלקה": "department",
  "שם פונה (שם פרטי + שם משפחה)": "name",
  "מספר טלפון": "phone",
  "נושא הפנייה": "topic",
  "כותרת הפנייה": "title",
  "פרטי הפנייה": "details",
  "שכבה": "gradeLevel",
  "כיתה": "class",
  "כתובת אימייל": "email"
};

async function fetchComplaints() {
  try {
    const credentials = JSON.parse(Deno.env.get("GOOGLE_JSON_KEY")!);

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
      const entry: Record<string,string> = {};
      headers.forEach((header, i) => {
        const key = FIELD_MAP[header];
        if (key) entry[key] = row[i] || "";
      });

      return {
        id: (idx+1).toString(),
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

    return complaints.filter(c => c.title || c.details);

  } catch (error) {
    console.error("Error fetching complaints:", error);
    return [];
  }
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

  const complaints = await fetchComplaints();
  return new Response(JSON.stringify(complaints), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
