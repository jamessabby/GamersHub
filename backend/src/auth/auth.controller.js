const authService = require("./auth.service");

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

module.exports = {
  register,
  login,
};
