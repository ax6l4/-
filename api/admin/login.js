const { clients, send, methodNotAllowed, readBody, takeRateLimit, logError } = require("../../lib/data");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  try {
    const body = await readBody(req, res);
    if (!body) return;
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    if (!/^[a-z0-9_.-]{3,64}$/.test(username) || typeof body.password !== "string" || !body.password) {
      return send(res, 401, { error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    }
    const { auth, db } = clients();
    if (!await takeRateLimit(db, req, "admin-login", 10, 900)) {
      return send(res, 429, { error: "محاولات كثيرة، يرجى الانتظار ١٥ دقيقة." });
    }
    const { data: admin, error: lookupError } = await db.from("admin_accounts")
      .select("email").eq("username", username).maybeSingle();
    if (lookupError) throw lookupError;
    if (!admin) return send(res, 401, { error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    const { data, error } = await auth.auth.signInWithPassword({ email: admin.email, password: body.password });
    if (error || !data.session) return send(res, 401, { error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    res.setHeader("Set-Cookie", `admin_session=${encodeURIComponent(data.session.access_token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.min(data.session.expires_in, 3600)}${req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`);
    return send(res, 200, { authenticated: true });
  } catch (error) {
    logError(error, "admin-login");
    return send(res, 500, { error: "تعذر تسجيل الدخول الآن، يرجى المحاولة لاحقًا." });
  }
};
