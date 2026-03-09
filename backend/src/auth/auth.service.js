// hashes password
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepo = require("../users/user.repository");

async function registerUser(data) {
  // destructured version of data.username, data.password
  // const username = data.username
  // const password = data.password
  const { username, email, password } = data;
  if (!username || !email || !password) {
    const error = new Error("Username, email, and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await userRepo.findByUsername(username);
  if (existingUser) {
    const error = new Error("User already exists");
    error.statusCode = 409;
    throw error;
  }

  const existingEmail = await userRepo.findByEmail(normalizedEmail);
  if (existingEmail) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  // forces the code to wait for bcrypt to finish the math and return the hashedPassword before moving to the next line
  const hashedPassword = await bcrypt.hash(password, 10); // algorithm runs 10 times

  // so generate exactly 50 hex chars DB column USERS.MFA_SECRET NVARCHAR(50)
  const mfaSecret = crypto.randomBytes(25).toString("hex");

  await userRepo.createUser({
    username,
    email: normalizedEmail,
    passwordHash: hashedPassword,
    mfaSecret,
  });

  return { message: "User created successfully" };
}

async function loginUser(data) {
  const { username, password } = data;
  if (!username || !password) {
    const error = new Error("Username and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepo.findByUsername(username);
  if (!user) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  return { message: "Login successful" };
}

module.exports = {
  registerUser,
  loginUser,
};
