// hashes password
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepo = require("../users/user.repository");

async function registerUser(data) {
  // destructured version of data.username, data.password
  // const username = data.username
  // const password = data.password
  const { username, password } = data;

  const existingUser = await userRepo.findByUsername(username);
  if (existingUser) {
    throw new Error("User already exists");
  }

  // forces the code to wait for bcrypt to finish the math and return the hashedPassword before moving to the next line
  const hashedPassword = await bcrypt.hash(password, 10); // algorithm runs 10 times

  // so generate exactly 50 hex chars DB column USERS.MFA_SECRET NVARCHAR(50)
  const mfaSecret = crypto.randomBytes(25).toString("hex");

  await userRepo.createUser({
    username,
    passwordHash: hashedPassword,
    mfaSecret,
  });

  return { message: "User created successfully" };
}

async function loginUser(data) {
  const { username, password } = data;

  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw new Error("No user found.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new Error("Invalid Password.");
  }

  return { message: "Login successful" };
}

module.exports = {
  registerUser,
  loginUser,
};
