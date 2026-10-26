const { google } = require("googleapis");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    let credentials;
    try {
      const rawJson = process.env.GOOG_JSON;
      credentials = JSON.parse(rawJson.includes('\\n') ? rawJson.replace(/\\n/g, '\n') : rawJson);
    } catch (parseErr) {
      throw new Error("Invalid GOOG_JSON environment variable format: " + parseErr.message);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [[
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      body.name || '',
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
      range: 'A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Order creation error:", err);
    return res.status(500).json({ error: err.message });
  }
};
