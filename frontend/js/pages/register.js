document.addEventListener("DOMContentLoaded", () => {
  const signInBtn = document.getElementById("signInBtn");
  const googleBtn = document.getElementById("googleBtn");
  const fields = {
    firstName: document.getElementById("firstName"),
    lastName: document.getElementById("lastName"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
  };

  Object.values(fields).forEach((input) => {
    input.addEventListener("input", () => input.classList.remove("error"));
  });

  signInBtn.addEventListener("click", () => {
    let valid = true;
    Object.values(fields).forEach((input) => {
      if (!input.value.trim()) {
        input.classList.add("error");
        valid = false;
      }
    });
    if (
      fields.password.value &&
      fields.confirmPassword.value &&
      fields.password.value !== fields.confirmPassword.value
    ) {
      fields.confirmPassword.classList.add("error");
      valid = false;
    }
    if (valid)
      console.log("Registration attempt:", { email: fields.email.value });
  });

  googleBtn.addEventListener("click", () =>
    console.log("Google sign-in initiated"),
  );
});
