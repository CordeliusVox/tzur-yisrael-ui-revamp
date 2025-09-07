import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CONFIG
const SHEET_ID = "175Cy5X6zNDaNAfDwK6HuuFZVFOQspDAweFTXgB-BoIk";
const RANGE = "תגובות לתופס 1"; // Hebrew range

const FIELD_MAP: Record<string, string> = {
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
    const apiKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_SHEETS_API_KEY secret is missing");

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);

    const data = await response.json();
    const rows = data.values;
    if (!rows || rows.length < 2) return { success: true, message: "No rows found" };

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const complaints = dataRows.map((row: string[], idx: number) => {
      const entry: Record<string, string> = {};
      headers.forEach((header: string, colIdx: number) => {
        const key = FIELD_MAP[header];
        if (key && !entry[key] && row[colIdx]) entry[key] = row[colIdx];
      });
      return {
        id: idx + 1,
        title: entry.title || "",
        details: entry.details || "",
        topic: entry.topic || "כללי",
        timestamp: entry.timestamp || "",
      };
    });

    return { success: true, message: `Synced ${complaints.length} complaints`, complaints };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

serve(async (_req) => {
  const result = await fetchComplaints();

  const html = `
    <!DOCTYPE html>
    <html lang="he">
    <head>
      <meta charset="UTF-8">
      <title>Google Sheet Sync</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; text-align: center; }
        .success { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        pre { text-align: left; max-width: 600px; margin: 1rem auto; background: #f0f0f0; padding: 1rem; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>Google Sheet Sync</h1>
      <p class="${result.success ? "success" : "fail"}">
        ${result.success ? "✅ Sync successful" : "❌ Sync failed"}
      </p>
      <p>${result.message || ""}</p>
      ${result.complaints ? `<pre>${JSON.stringify(result.complaints, null, 2)}</pre>` : ""}
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
});