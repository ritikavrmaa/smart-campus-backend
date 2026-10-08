const fs = require('fs');
const path = require('path');

async function testBackendAiBridge() {
  const imagePath = path.join(__dirname, '..', 'frontend', 'mobile-app', 'assets', 'images', 'icon.png');
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');

  console.log("Testing Backend AI bridge with Base64 JSON...");
  try {
    const res = await fetch('http://localhost:5000/api/ai/count-people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64 }),
    });
    const text = await res.text();
    console.log("Backend bridge response status:", res.status);
    console.log("Backend bridge response body:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

testBackendAiBridge();
