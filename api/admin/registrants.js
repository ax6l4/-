const { send, methodNotAllowed, readBody, requireAdmin, logError } = require("../../lib/data");

module.exports = async (req, res) => {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return send(res, auth.status, { error: auth.error });
    if (req.method === "GET") {
      const { data, error } = await auth.db.from("registrants")
        .select("id,full_name,phone,football,volleyball,leader,created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return send(res, 200, { registrants: data });
    }
    if (req.method === "DELETE") {
      const body = await readBody(req, res);
      if (!body) return;
      if (typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
        return send(res, 400, { error: "معرّف التسجيل غير صالح." });
      }
      const { error } = await auth.db.from("registrants").delete().eq("id", body.id);
      if (error) throw error;
      return send(res, 200, { deleted: true });
    }
    return methodNotAllowed(res, "GET, DELETE");
  } catch (error) {
    logError(error, "admin-registrants");
    return send(res, 500, { error: "تعذر تحميل التسجيلات أو تحديثها." });
  }
};
