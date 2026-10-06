const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("node:crypto");

function clients() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("إعدادات قاعدة البيانات غير مكتملة.");
  }
  return {
    auth: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
    db: createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  };
}

function send(res, status, body, headers = {}) {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  return res.status(status).json(body);
}

function methodNotAllowed(res, allowed) {
  return send(res, 405, { error: "طريقة الطلب غير مسموحة." }, { Allow: allowed });
}

async function readBody(req, res) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    send(res, 415, { error: "صيغة الطلب غير مدعومة." });
    return null;
  }
  const length = Number(req.headers["content-length"] || 0);
  if (length > 10_000) {
    send(res, 413, { error: "حجم الطلب أكبر من المسموح." });
    return null;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      send(res, 400, { error: "بيانات الطلب غير صالحة." });
      return null;
    }
  }
  if (req.body && typeof req.body === "object") return req.body;
  send(res, 400, { error: "بيانات الطلب غير صالحة." });
  return null;
}

function normalizeName(name) {
  return name.trim().normalize("NFKC").replace(/\s+/g, " ")
    .replace(/[أإآٱء]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه");
}

function isValidName(name) {
  return typeof name === "string"
    && name.length <= 120
    && /^[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FC]+(?:\s+[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FC]+)*$/u.test(name)
    && name.trim().split(/\s+/).length >= 5;
}

function normalizePhone(phone) {
  if (typeof phone !== "string") return "";
  return phone.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function validPhone(phone) {
  return /^[0-9]{5,20}$/.test(phone);
}

function getClientAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return candidate?.trim() || req.socket?.remoteAddress || "unknown";
}

async function takeRateLimit(db, req, scope, limit, windowSeconds) {
  const addressHash = createHash("sha256").update(getClientAddress(req)).digest("hex");
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_key: `${scope}:${addressHash}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  for (const item of cookies.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function cookieOptions(req, maxAge) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

async function requireAdmin(req) {
  const { auth, db } = clients();
  const token = getCookie(req, "admin_session");
  if (!token) return { error: "يلزم تسجيل الدخول.", status: 401 };
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) return { error: "انتهت الجلسة، يرجى تسجيل الدخول مجددًا.", status: 401 };
  const { data: admin, error: adminError } = await db
    .from("admin_accounts").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError) throw adminError;
  if (!admin) return { error: "هذا الحساب غير مخوّل للإدارة.", status: 403 };
  return { user, db };
}

function logError(error, context) {
  console.error(`[${context}]`, error?.message || error);
}

module.exports = {
  clients,
  send,
  methodNotAllowed,
  readBody,
  normalizeName,
  isValidName,
  normalizePhone,
  validPhone,
  takeRateLimit,
  cookieOptions,
  requireAdmin,
  logError,
};
