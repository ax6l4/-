const { clients, send, methodNotAllowed, readBody, normalizeName, isValidName, normalizePhone, validPhone, takeRateLimit, logError } = require("../lib/data");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  try {
    const body = await readBody(req, res);
    if (!body) return;
    const phone = normalizePhone(body.phone);
    if (!isValidName(body.fullName)) return send(res, 400, { error: "يرجى إدخال الاسم بخمس كلمات عربية على الأقل." });
    if (!validPhone(phone)) return send(res, 400, { error: "يرجى إدخال رقم هاتف صحيح بالأرقام فقط." });
    if (typeof body.football !== "boolean" || typeof body.volleyball !== "boolean"
      || typeof body.leader !== "boolean" || (!body.football && !body.volleyball)) {
      return send(res, 400, { error: "يرجى اختيار الرياضة وإجابة سؤال القيادة." });
    }
    const { db } = clients();
    if (!await takeRateLimit(db, req, "register", 6, 900)) {
      return send(res, 429, { error: "تم تجاوز عدد محاولات التسجيل، يرجى الانتظار قليلًا." });
    }
    const { error } = await db.from("registrants").insert({
      full_name: body.fullName.trim().replace(/\s+/g, " "),
      phone,
      football: body.football,
      volleyball: body.volleyball,
      leader: body.leader,
    });
    if (error?.code === "23505") return send(res, 409, { error: "هذا الاسم مسجّل مسبقًا" });
    if (error) throw error;
    return send(res, 201, { registered: true });
  } catch (error) {
    logError(error, "register");
    return send(res, 500, { error: "تعذر حفظ التسجيل الآن، يرجى المحاولة لاحقًا." });
  }
};
