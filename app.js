const form = document.querySelector("#registration-form");
const panels = [...document.querySelectorAll(".step-panel")];
const notice = document.querySelector("#notice");
const progressFill = document.querySelector("#progress-fill");
const stepLabel = document.querySelector("#step-label");
const stepCaption = document.querySelector("#step-caption");
const captions = ["بياناتك", "رياضتك", "القيادة"];
let currentStep = 1;
let applicant = {};

const arabicDigits = (value) => value.replace(/[٠-٩۰-۹]/g, (digit) => {
  const code = digit.charCodeAt(0);
  return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
});

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function clearNotice() {
  notice.textContent = "";
  notice.hidden = true;
}

function showStep(step) {
  currentStep = step;
  panels.forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== step; });
  stepLabel.textContent = `الخطوة ${["١", "٢", "٣"][step - 1]} من ٣`;
  stepCaption.textContent = captions[step - 1];
  progressFill.style.width = `${step / 3 * 100}%`;
  clearNotice();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر إتمام الطلب، حاول مرة أخرى.");
  return data;
}

form.addEventListener("click", async (event) => {
  const nextButton = event.target.closest("[data-next]");
  if (nextButton) {
    clearNotice();
    if (currentStep === 1) {
      const fullName = document.querySelector("#full-name").value.trim().replace(/\s+/g, " ");
      const phone = arabicDigits(document.querySelector("#phone").value.trim());
      const words = fullName ? fullName.split(" ") : [];
      if (words.length < 5) return showNotice("يرجى إدخال الاسم بخمس كلمات على الأقل.");
      if (!/^[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FC]+(?:\s+[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FC]+)*$/u.test(fullName)) {
        return showNotice("يُقبل الاسم بالحروف العربية فقط.");
      }
      if (!/^[0-9]+$/.test(phone)) return showNotice("يرجى إدخال رقم هاتف صحيح بالأرقام فقط.");
      const originalText = nextButton.textContent;
      nextButton.disabled = true;
      nextButton.textContent = "جارٍ التحقق…";
      try {
        await postJson("/api/check-name", { fullName });
        applicant = { fullName, phone };
        showStep(2);
      } catch (error) {
        showNotice(error.message);
      } finally {
        nextButton.disabled = false;
        nextButton.textContent = originalText;
      }
    } else {
      const sport = form.querySelector('input[name="sport"]:checked');
      if (!sport) return showNotice("يرجى اختيار الرياضة التي ترغب بالمشاركة فيها.");
      applicant.sport = sport.value;
      showStep(3);
    }
  }
  if (event.target.closest("[data-back]")) showStep(currentStep - 1);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice();
  const leader = form.querySelector('input[name="leader"]:checked');
  if (!leader) return showNotice("يرجى اختيار نعم أو لا في سؤال القيادة.");
  const submitButton = document.querySelector("#submit-registration");
  submitButton.disabled = true;
  submitButton.textContent = "جارٍ التسجيل…";
  const sports = applicant.sport === "both"
    ? { football: true, volleyball: true }
    : { football: applicant.sport === "football", volleyball: applicant.sport === "volleyball" };
  try {
    await postJson("/api/register", {
      ...applicant,
      ...sports,
      leader: leader.value === "yes",
    });
    form.hidden = true;
    document.querySelector(".progress").hidden = true;
    document.querySelector(".registration-heading").hidden = true;
    document.querySelector("#success-panel").hidden = false;
  } catch (error) {
    if (error.message === "هذا الاسم مسجّل مسبقًا") showStep(1);
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "تسجيل";
  }
});

form.addEventListener("input", clearNotice);
