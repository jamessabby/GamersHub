const userService = require("./user.service");

async function getProfile(req, res) {
  try {
    const profile = await userService.getProfileByUserId(req.params.userId);
    res.status(200).json(profile);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load profile." });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await userService.updateProfileByUserId(
      req.params.userId,
      req.body,
    );
    res.status(200).json(profile);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to update profile." });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
