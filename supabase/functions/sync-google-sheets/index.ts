import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Google Sheets sync...');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    // Get the service account credentials from Supabase secrets
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('Service account key available:', !!serviceAccountKey);
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found');
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log('Successfully parsed service account credentials');
      console.log('Client email:', credentials.client_email);
    } catch (error) {
      console.error('Failed to parse service account key as JSON:', error);
      throw new Error(`Service account key must be in JSON format: ${error.message}`);
    }

    console.log('Creating JWT for Google API authentication...');
    
    let jwt;
    
    // Let's try a much simpler approach first - test the basic flow
    try {
      // Test basic access first
      console.log('Testing basic Google Sheets API access...');
      
      // Create a simple JWT manually (the djwt import was causing issues)
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const headerEncoded = btoa(JSON.stringify(header)).replace(/[+/]/g, (c) => c === '+' ? '-' : '_').replace(/=/g, '');
      const payloadEncoded = btoa(JSON.stringify(payload)).replace(/[+/]/g, (c) => c === '+' ? '-' : '_').replace(/=/g, '');
      
      const signData = headerEncoded + '.' + payloadEncoded;
      console.log('Sign data created, length:', signData.length);
      
      // Import the private key properly
      const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
      console.log('Private key starts with:', privateKeyPem.substring(0, 50));
      console.log('Private key ends with:', privateKeyPem.substring(privateKeyPem.length - 50));
      
      // Convert PEM to ArrayBuffer
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const pemContents = privateKeyPem.substring(pemHeader.length, privateKeyPem.length - pemFooter.length).replace(/\s/g, '');
      
      const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      console.log('Binary DER length:', binaryDer.length);

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      console.log('Private key imported successfully');

      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(signData)
      );
      
      const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/[+/]/g, (c) => c === '+' ? '-' : '_').replace(/=/g, '');
      
      jwt = signData + '.' + signatureEncoded;
      console.log('JWT created, length:', jwt.length);

    } catch (jwtError) {
      console.error('JWT creation failed:', jwtError);
      throw new Error(`JWT creation failed: ${jwtError.message}`);
    }

    // Get access token
    console.log('Requesting access token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('Got access token successfully');

    // Google Sheet configuration
    const SHEET_ID = '175Cy5X6zNDaNAfDwK6HuuFZVFOQspDAweFTXgB-BoIk';
    const RANGE = 'תגובות לטופס 1'; // Hebrew range name (corrected)

    // Fetch data from Google Sheets - properly encode the Hebrew range name
    console.log('Fetching data from Google Sheets...');
    const encodedRange = encodeURIComponent(RANGE);
    console.log('Using range:', RANGE, 'Encoded as:', encodedRange);
    
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Sheets API request failed:', errorText);
      throw new Error(`Failed to fetch sheet data: ${errorText}`);
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    
    console.log(`Found ${rows.length} rows in the sheet`);

    if (rows.length === 0) {
      throw new Error('No data found in the sheet');
    }

    // Get headers and find column indices (handling duplicates)
    const headers = rows[0] || [];
    console.log('Headers found:', headers);

    // Helper function to get value from multiple possible columns (for duplicates)
    const getValueFromColumns = (row, columnName) => {
      const indices = [];
      headers.forEach((header, index) => {
        if (header && header.trim() === columnName) {
          indices.push(index);
        }
      });
      
      // Return the first non-empty value from matching columns
      for (const index of indices) {
        const value = row[index];
        if (value && value.toString().trim() !== '') {
          return value.toString().trim();
        }
      }
      return '';
    };

    // Skip header row and process complaints
    const complaints = rows.slice(1).map((row, index) => {
      // Use helper function to get values, handling duplicates by taking first non-empty
      const title = getValueFromColumns(row, 'כותרת הפנייה') || `תלונה ${index + 1}`;
      const description = getValueFromColumns(row, 'פרטי הפנייה') || 'תיאור לא זמין';
      const category = getValueFromColumns(row, 'נושא הפנייה') || 'אחר';
      const submitter_email = getValueFromColumns(row, 'מגיש הפנייה') || 'unknown@example.com';
      const submitter_name = getValueFromColumns(row, 'שם פונה (שם פרטי + שם משפחה)') || 'לא ידוע';
      const phone = getValueFromColumns(row, 'מספר טלפון') || '';
      const department = getValueFromColumns(row, 'מחלקה') || '';
      const role = getValueFromColumns(row, 'תפקיד') || '';
      const grade = getValueFromColumns(row, 'שכבה') || '';
      const class_name = getValueFromColumns(row, 'כיתה') || '';

      console.log(`Processing row ${index + 1}:`, {
        title: title.substring(0, 50),
        submitter_email,
        category
      });

      return {
        title,
        description,
        category,
        status: 'לא שויך',
        submitter_email,
        submitter_name,
        phone,
        department,
        role,
        grade,
        class: class_name
      };
    });

    // Initialize Supabase client
    const supabaseUrl = 'https://daxknkbmetzajmgdpniz.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      throw new Error('Supabase service role key not found');
    }

    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let syncedCount = 0;
    let errors = 0;

    // Process each complaint
    for (const complaint of complaints) {
      try {
        // Find or create user by email
        let userId = null;
        
        // First, try to find existing profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', complaint.submitter_email)
          .single();

        if (existingProfile) {
          userId = existingProfile.user_id;
        } else {
          // Create a temporary user ID for external complaints
          userId = crypto.randomUUID();
          
          // Create profile for external user
          await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              email: complaint.submitter_email,
              username: complaint.submitter_email.split('@')[0]
            });
        }

        // Check if complaint already exists (by title and description to avoid duplicates)
        const { data: existingComplaint } = await supabase
          .from('complaints')
          .select('id')
          .eq('title', complaint.title)
          .eq('description', complaint.description)
          .single();

        if (!existingComplaint) {
          // Insert new complaint
          const { error: insertError } = await supabase
            .from('complaints')
            .insert({
              title: complaint.title,
              description: complaint.description,
              category: complaint.category,
              status: complaint.status,
              submitter_id: userId
            });

          if (insertError) {
            console.error('Error inserting complaint:', insertError);
            errors++;
          } else {
            syncedCount++;
          }
        }
      } catch (error) {
        console.error('Error processing complaint:', error);
        errors++;
      }
    }

    console.log(`Sync completed: ${syncedCount} new complaints, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed successfully`,
        synced: syncedCount,
        errors: errors,
        total_rows: complaints.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Sync function error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});