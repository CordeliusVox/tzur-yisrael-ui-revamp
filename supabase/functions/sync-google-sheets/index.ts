// backend/sheets.js
import { google } from "googleapis";
import fs from "fs";
import path from "path";

// CONFIG
const SHEET_ID = "175Cy5X6zNDaNAfDwK6HuuFZVFOQspDAweFTXgB-BoIk";
const RANGE = "תגובות לתופס 1"; // Your sheet name

// Load credentials
const KEYFILE_PATH = path.join(process.cwd(), "service-account.json"); // Download JSON from Google Cloud
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

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

export async function fetchComplaints() {
  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const complaints = dataRows.map((row, idx) => {
    const entry = {};
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const header = headers[colIndex];
      const key = FIELD_MAP[header];
      const value = row[colIndex] || "";

      if (key) {
        // If field already has a value, don’t overwrite (fixes duplicates)
        if (!entry[key]) {
          entry[key] = value;
        }
      }
    }

    return {
      id: idx + 1, // Persistent ID
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
    };
  });

  return complaints.filter(c => c.title || c.details); // Only keep filled complaints
}
