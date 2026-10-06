const { send, methodNotAllowed, cookieOptions } = require("../../lib/data");

module.exports = async (req, res) => {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  res.setHeader("Set-Cookie", cookieOptions(req, 0));
  return send(res, 200, { authenticated: false });
};
