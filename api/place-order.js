import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOG_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [[
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      body.name || body.customerName || '',
      body.phone || '',
      body.email || '',
      body.address || '',
      body.product || 'T-shirt',
      body.size || 'M',
      body.payment || 'COD',
      body.amount || 649
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
