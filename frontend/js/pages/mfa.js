document.getElementById("verifyBtn").addEventListener("click", function () {
  const code = document.getElementById("mfaCode").value.trim();

  if (!code) {
    alert("Please enter the verification code.");
    return;
  }

  // TODO: Replace with actual API call
  console.log("Verifying MFA code:", code);
  alert("Code submitted: " + code);
});

document.getElementById("mfaCode").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    document.getElementById("verifyBtn").click();
  }
});
