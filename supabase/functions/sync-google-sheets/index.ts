import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    // Get the service account credentials from Supabase secrets
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found');
    }

    const credentials = JSON.parse(serviceAccountKey);
    console.log('Parsed service account credentials');

    // Create JWT for Google API authentication
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Base64url encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Create signature using RS256
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(`${encodedHeader}.${encodedPayload}`);
    
    // Import private key for signing
    const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      textEncoder.encode(privateKeyPem),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

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

    // TODO: Replace with your actual Google Sheet ID and range
    const SHEET_ID = 'YOUR_SHEET_ID_HERE';
    const RANGE = 'Sheet1!A:E'; // Adjust range as needed

    // Fetch data from Google Sheets
    console.log('Fetching data from Google Sheets...');
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}`,
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

    // Skip header row and process complaints
    const complaints = rows.slice(1).map((row, index) => {
      return {
        title: row[0] || `תלונה ${index + 1}`,
        description: row[1] || 'תיאור לא זמין',
        category: row[2] || 'אחר',
        status: row[3] || 'לא שויך',
        submitter_email: row[4] || 'unknown@example.com'
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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});