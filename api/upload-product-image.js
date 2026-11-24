const OWNER_EMAIL = "7eclipses2026@gmail.com";
const FIREBASE_API_KEY = "AIzaSyCJ2KbU4YlhrXz2loHdhC_E8nEXVDIaSwE";
const PROJECT_ID = "eclipses-1bf5c";
const REPOSITORY = "7eclipses2026-cyber/7eclipses2.0";
const uploadRateLimit = new Map();

function json(res, status, body) {
  return res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed." });
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host !== "7eclipses.com" && host !== "www.7eclipses.com" && !host.endsWith(".vercel.app") && host !== "localhost") {
        return json(res, 403, { error: "Request origin not allowed." });
      }
    } catch {
      return json(res, 403, { error: "Invalid request origin." });
    }
  }

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (uploadRateLimit.get(ip) || []).filter(time => now - time < 15 * 60 * 1000);
  if (recent.length >= 12) return json(res, 429, { error: "Too many photo uploads. Please try again later." });
  recent.push(now);
  uploadRateLimit.set(ip, recent);

  const githubToken = process.env.GITHUB_IMAGE_UPLOAD_TOKEN;
  if (!githubToken) return json(res, 503, { error: "Photo uploads are not configured yet. The owner must finish the one-time secure GitHub setup." });

  const authorization = String(req.headers.authorization || "");
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return json(res, 401, { error: "Please sign in again before uploading." });

  try {
    const identityResponse = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Referer": "https://www.7eclipses.com/" },
      body: JSON.stringify({ idToken })
    });
    const identity = await identityResponse.json().catch(() => ({}));
    const user = identity.users && identity.users[0];
    if (!identityResponse.ok || !user || !user.email) return json(res, 401, { error: "Your sign-in session expired. Please sign in again." });

    const email = String(user.email).toLowerCase();
    let allowed = email === OWNER_EMAIL;
    if (!allowed) {
      const managerUrl = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/stockManagers/" + encodeURIComponent(email);
      const managerResponse = await fetch(managerUrl, { headers: { Authorization: "Bearer " + idToken } });
      if (managerResponse.ok) {
        const manager = await managerResponse.json().catch(() => ({}));
        allowed = manager.fields && manager.fields.email && String(manager.fields.email.stringValue || "").toLowerCase() === email;
      }
    }
    if (!allowed) return json(res, 403, { error: "Only an approved 7ECLIPSES Stock Manager can upload product photos." });

    const body = req.body || {};
    const contentType = String(body.contentType || "").toLowerCase();
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
    if (!extensions[contentType]) return json(res, 400, { error: "Use a JPG, PNG, WebP or AVIF image." });

    const base64 = String(body.base64 || "");
    if (!base64 || base64.length > 4 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      return json(res, 413, { error: "The image is too large. Please use an image smaller than 3 MB." });
    }
    const imageBuffer = Buffer.from(base64, "base64");
    if (!imageBuffer.length || imageBuffer.length > 3 * 1024 * 1024) {
      return json(res, 413, { error: "The image is too large. Please use an image smaller than 3 MB." });
    }

    const originalName = String(body.fileName || "product-photo").split(/[\\/]/).pop();
    const baseName = originalName.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 55) || "product-photo";
    const fileName = Date.now() + "-" + crypto.randomUUID() + "-" + baseName + "." + extensions[contentType];
    const path = "public/images/" + fileName;
    const githubUrl = "https://api.github.com/repos/" + REPOSITORY + "/contents/" + path.split("/").map(encodeURIComponent).join("/");

    const githubResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + githubToken,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Add product image " + fileName,
        content: imageBuffer.toString("base64"),
        branch: "main"
      })
    });
    const githubResult = await githubResponse.json().catch(() => ({}));
    if (!githubResponse.ok) {
      console.error("GitHub product image upload failed:", githubResponse.status, githubResult.message || "Unknown error");
      if (githubResponse.status === 401 || githubResponse.status === 403) {
        return json(res, 502, { error: "GitHub did not accept the upload key. Check that it has Contents: Read and write access to the 7ECLIPSES repository." });
      }
      return json(res, 502, { error: "GitHub could not save this photo. Please try again." });
    }

    const url = "https://raw.githubusercontent.com/" + REPOSITORY + "/main/" + path.split("/").map(encodeURIComponent).join("/");
    return json(res, 200, { success: true, url, path });
  } catch (error) {
    console.error("Product image upload endpoint failed:", error);
    return json(res, 500, { error: "The photo could not be uploaded. Please try again." });
  }
};
