import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CONFIG
const SHEET_ID = "175Cy5X6zNDaNAfDwK6HuuFZVFOQspDAweFTXgB-BoIk";
const RANGE = "תגובות לתופס 1!A:Z";

// Map Hebrew field names → Normalized keys
const FIELD_MAP = {
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
};

async function fetchComplaints() {
  try {
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Sheets API key not configured');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const complaints = dataRows.map((row: string[], idx: number) => {
      const entry: Record<string, string> = {};
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];
        const key = FIELD_MAP[header as keyof typeof FIELD_MAP];
        const value = row[colIndex] || "";

        if (key) {
          if (!entry[key]) {
            entry[key] = value;
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
        status: "חדש",
        category: entry.topic || "כללי",
        submitter_id: "external",
        created_at: entry.timestamp || new Date().toISOString(),
        updated_at: entry.timestamp || new Date().toISOString(),
      };
    });

    return complaints.filter(c => c.title || c.details);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    const complaints = await fetchComplaints();

    return new Response(
      JSON.stringify(complaints),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch complaints' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
