// hashes password
const bcrypt = require("bcrypt");

const users = [];

async function registerUser(data) {
  // destructured version of data.username, data.password
  const { username, password } = data;

  // forces the code to wait for bcrypt to finish the math and return the hashedPassword before moving to the next line
  const hashedPassword = await bcrypt.hash(password, 10); // algorithm runs 10 times

  const newUser = {
    username,
    password: hashedPassword,
  };

  users.push(newUser);

  return "User Created Successfully";
}

async function loginUser(data) {
  const { username, password } = data;

  const user = users.find((u) => u.username === username);

  if (!user) {
    throw new Error("No user found.");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid Password.");
  }

  return { message: "Login successful" };
}

module.exports = {
  registerUser,
  loginUser,
};
