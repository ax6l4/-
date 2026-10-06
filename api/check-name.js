const { clients, send, methodNotAllowed, readBody, normalizeName, isValidName, takeRateLimit, logError } = require("../lib/data");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  try {
    const body = await readBody(req, res);
    if (!body) return;
    if (!isValidName(body.fullName)) return send(res, 400, { error: "يرجى إدخال الاسم بخمس كلمات عربية على الأقل." });
    const { db } = clients();
    if (!await takeRateLimit(db, req, "check-name", 20, 900)) {
      return send(res, 429, { error: "تم تجاوز عدد المحاولات، يرجى الانتظار قليلًا." });
    }
    const { data, error } = await db.from("registrants").select("id")
      .eq("normalized_name", normalizeName(body.fullName)).maybeSingle();
    if (error) throw error;
    if (data) return send(res, 409, { error: "هذا الاسم مسجّل مسبقًا" });
    return send(res, 200, { available: true });
  } catch (error) {
    logError(error, "check-name");
    return send(res, 500, { error: "تعذر التحقق من الاسم الآن، يرجى المحاولة لاحقًا." });
  }
};
