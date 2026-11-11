const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const fillButton = document.getElementById("fillButton");
const clearButton = document.getElementById("clearButton");
const toggleButton = document.getElementById("togglePassword");
const statusMessage = document.getElementById("status");
const errorMessage = document.getElementById("error");

function clearLocalFields() {
  usernameInput.value = "";
  passwordInput.value = "";
}

function showMessage(element, message) {
  element.textContent = message;
}

function clearMessages() {
  statusMessage.textContent = "";
  errorMessage.textContent = "";
}

toggleButton.addEventListener("click", () => {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
});

clearButton.addEventListener("click", () => {
  clearLocalFields();
  clearMessages();
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showMessage(errorMessage, "Enter both IRCTC User ID and password.");
    return;
  }

  fillButton.disabled = true;
  fillButton.textContent = "Filling…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showMessage(errorMessage, "No active tab found.");
      return;
    }

    const url = tab.url || "";
    if (!url.startsWith("https://www.irctc.co.in/") && !url.startsWith("https://irctc.co.in/")) {
      showMessage(
        errorMessage,
        "Open https://www.irctc.co.in (train search or home), then try again."
      );
      return;
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: fillIrctcLoginForm,
      args: [username, password],
    });

    clearLocalFields();

    if (!result?.ok) {
      showMessage(errorMessage, result?.error || "Could not fill the IRCTC login form.");
      return;
    }

    showMessage(statusMessage, result.message);
  } catch (err) {
    const detail = err?.message ? ` (${err.message})` : "";
    showMessage(
      errorMessage,
      `Could not run on the IRCTC page. Reload the page and try again.${detail}`
    );
  } finally {
    fillButton.disabled = false;
    fillButton.textContent = "Fill & Sign In";
  }
});

function fillIrctcLoginForm(username, password) {
  function sleep(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* spin */
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && el.offsetParent !== null;
  }

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc?.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    try {
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: value })
      );
    } catch {
      /* InputEvent unsupported */
    }
  }

  function findLoginFields() {
    const userField =
      document.querySelector("#userId") ||
      document.querySelector('input[formcontrolname="userid"]') ||
      document.querySelector('input[name="userName"]') ||
      document.querySelector('input[placeholder*="User ID" i]');

    const passwordField =
      document.querySelector("#pwd") ||
      document.querySelector("#password") ||
      document.querySelector('input[formcontrolname="password"]') ||
      document.querySelector('input[type="password"]');

    return { userField, passwordField };
  }

  function openLoginModal() {
    if (isVisible(findLoginFields().userField)) return;

    const triggers = [
      document.querySelector("#loginText"),
      document.querySelector("a.loginText"),
      document.querySelector('[data-bs-target="#loginModal"]'),
      ...Array.from(document.querySelectorAll("a, button, span, div")).filter((el) =>
        /^\s*login\s*$/i.test((el.textContent || "").trim())
      ),
    ].filter(Boolean);

    for (const el of triggers) {
      try {
        el.click();
        sleep(400);
        if (isVisible(findLoginFields().userField)) return;
      } catch {
        /* try next */
      }
    }
  }

  openLoginModal();

  let userField;
  let passwordField;
  for (let i = 0; i < 25; i += 1) {
    ({ userField, passwordField } = findLoginFields());
    if (isVisible(userField) && passwordField) break;
    openLoginModal();
    sleep(200);
  }

  if (!userField || !passwordField) {
    return {
      ok: false,
      error: "Login form not found. On IRCTC, click LOGIN in the header, then use Fill & Sign In again.",
    };
  }

  userField.focus();
  setNativeValue(userField, username);
  passwordField.focus();
  setNativeValue(passwordField, password);

  const captchaField =
    document.querySelector("#nlpAnswer") ||
    document.querySelector('input[name="nlpAnswer"]') ||
    document.querySelector('input[placeholder*="captcha" i]');

  const signInButton = Array.from(document.querySelectorAll("button")).find((btn) =>
    /sign\s*in/i.test((btn.textContent || "").trim())
  );

  if (captchaField && !captchaField.value?.trim()) {
    passwordField.blur();
    if (signInButton) signInButton.focus();
    return {
      ok: true,
      message:
        "User ID and password filled. Enter the captcha on the IRCTC page, then click SIGN IN.",
    };
  }

  if (signInButton && !signInButton.disabled) {
    signInButton.click();
    return {
      ok: true,
      message: "Filled and clicked SIGN IN. Complete captcha or OTP if IRCTC still asks.",
    };
  }

  return {
    ok: true,
    message: "Credentials filled. Click SIGN IN on the IRCTC page after captcha (if any).",
  };
}
