import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@118.0.0";

// CONFIG
const SHEET_ID = "1paz6Ox8TnSiBdct3TxfTFt4I3bbeFnEWeH0y-c24ZxM";
const RANGE = "Form Responses 1";

// Map Hebrew field names → Normalized keys
const FIELD_MAP: Record<string, string[]> = {
  timestamp: ["timestamp"],
  submitter: ["מגיש הפנייה"],
  role: ["תפקיד"],
  department: ["מחלקה"],
  name: ["שם פונה (שם פרטי + שם משפחה)"],
  phone: ["מספר טלפון"],
  topic: ["נושא הפנייה"],
  title: ["כותרת הפנייה"],
  details: ["פרטי הפנייה"],
  gradeLevel: ["שכבה"],
  class: ["כיתה"],
  email: ["כתובת אימייל"],
};

// Create Google Sheets client using service account JSON
async function getSheetsClient() {
  const credentials = JSON.parse(Deno.env.get("GOOGLE_JSON_KEY")!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

async function fetchComplaints() {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map headers → indices
    const headerIndices: Record<string, number[]> = {};
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      for (const [key, possibleHeaders] of Object.entries(FIELD_MAP)) {
        if (possibleHeaders.includes(header)) {
          if (!headerIndices[key]) headerIndices[key] = [];
          headerIndices[key].push(colIndex);
        }
      }
    }

    const complaints = dataRows.map((row: string[], idx: number) => {
      const entry: Record<string, string> = {};

      for (const [key, indices] of Object.entries(headerIndices)) {
        for (const i of indices) {
          const value = row[i] || "";
          if (value.trim() !== "") {
            entry[key] = value;
            break; // take first non-empty
          }
        }
      }

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
    const complaints = await fetchComplaints();
    return new Response(JSON.stringify(complaints), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch complaints" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
