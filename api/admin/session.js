const { send, methodNotAllowed, requireAdmin, logError } = require("../../lib/data");

module.exports = async (req, res) => {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  try {
    const result = await requireAdmin(req);
    if (result.error) return send(res, result.status, { error: result.error });
    return send(res, 200, { authenticated: true });
  } catch (error) {
    logError(error, "admin-session");
    return send(res, 500, { error: "تعذر التحقق من الجلسة." });
  }
};
