const authService = require("./auth.service");

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    if (error.message === "User already exists") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Registration failed" });
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
};
