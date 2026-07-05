const form = document.querySelector("#worryForm");
const worryInput = document.querySelector("#worryInput");
const toneSelect = document.querySelector("#toneSelect");
const emptyState = document.querySelector("#emptyState");
const receiptCard = document.querySelector("#receiptCard");
const receiptDate = document.querySelector("#receiptDate");
const receiptSubject = document.querySelector("#receiptSubject");
const receiptLines = document.querySelector("#receiptLines");
const originalTotal = document.querySelector("#originalTotal");
const discountTotal = document.querySelector("#discountTotal");
const finalTotal = document.querySelector("#finalTotal");
const actionCard = document.querySelector("#actionCard");
const actionText = document.querySelector("#actionText");
const reprintButton = document.querySelector("#reprintButton");
const copyButton = document.querySelector("#copyButton");

const chargeCatalog = [
  {
    id: "mind-reading",
    label: "Mind-reading fee",
    trap: "Assuming you know what someone else thinks",
    question: "What direct evidence do you have that they think this?",
    keywords: ["text", "reply", "message", "friend", "date", "dating", "they", "she", "he"],
  },
  {
    id: "fortune-telling",
    label: "Future disaster projection",
    trap: "Predicting the future as if it already happened",
    question: "What else could happen besides the worst-case version?",
    keywords: ["tomorrow", "future", "will", "going to", "presentation", "test", "exam", "interview"],
  },
  {
    id: "catastrophe",
    label: "Catastrophe surcharge",
    trap: "Turning a hard thing into total doom",
    question: "If this went badly, what would still be survivable or repairable?",
    keywords: ["ruined", "disaster", "everything", "never", "always", "worst", "fail"],
  },
  {
    id: "personalization",
    label: "It-is-all-my-fault tax",
    trap: "Taking full blame without checking the split",
    question: "What parts of this are not entirely under your control?",
    keywords: ["fault", "blame", "my fault", "should have", "because of me"],
  },
  {
    id: "should",
    label: "Should-have-handled-it-perfectly penalty",
    trap: "Demanding perfect behavior from a real human",
    question: "What standard would you use for a friend in the same situation?",
    keywords: ["should", "must", "supposed", "perfect", "embarrassing"],
  },
  {
    id: "emotional-reasoning",
    label: "Feelings-as-facts markup",
    trap: "Treating a feeling as proof",
    question: "Does feeling it make it true, or does it make it important to notice?",
    keywords: ["feel", "feeling", "anxious", "guilty", "scared", "ashamed"],
  },
  {
    id: "control",
    label: "Control-the-uncontrollable service fee",
    trap: "Trying to manage what is not yours to manage",
    question: "What is the smallest part of this you can actually influence?",
    keywords: ["control", "make them", "fix", "force", "wait"],
  },
];

const fallbackCharges = [
  "mind-reading",
  "fortune-telling",
  "catastrophe",
  "emotional-reasoning",
  "control",
];

const actions = {
  text: "Wait 20 minutes before sending anything. If it still matters, send one clear sentence instead of three nervous paragraphs.",
  work: "Write the next concrete task on paper. Do that one task for 10 minutes before re-evaluating the whole situation.",
  social: "Ask one direct, kind question instead of building a whole courtroom in your head.",
  money: "Separate facts from guesses. Check the real number once, then choose one practical money step.",
  default: "Name the one thing you can actually do today. Make it small enough to finish in under 10 minutes.",
};

let activeReceipt = null;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  printReceipt();
});

reprintButton.addEventListener("click", printReceipt);

copyButton.addEventListener("click", async () => {
  if (!activeReceipt) {
    return;
  }

  const text = buildReceiptText();

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy receipt";
    }, 1300);
  } catch {
    copyButton.textContent = "Copy failed";
  }
});

function printReceipt() {
  const worry = worryInput.value.trim() || "A vague anxious cloud with no itemized memo";
  const tone = toneSelect.value;
  activeReceipt = createReceipt(worry, tone);
  emptyState.hidden = true;
  receiptCard.hidden = false;
  actionCard.hidden = true;
  receiptDate.textContent = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  receiptSubject.textContent = worry;
  renderReceipt();
}

function createReceipt(worry, tone) {
  const selectedCharges = selectCharges(worry);
  const seed = hashString(`${worry}-${Date.now()}`);
  const charges = selectedCharges.map((charge, index) => {
    const amount = 8 + ((seed + index * 17) % 24) + index * 1.35;
    return {
      ...charge,
      amount: roundMoney(amount),
      payable: roundMoney(amount),
      status: "pending",
      note: getToneNote(tone, charge.id),
      argument: "",
      isOpen: false,
    };
  });

  charges.push({
    id: "real-action",
    label: "Actual next-step handling",
    trap: "The part that might be real enough to act on",
    question: "What is the smallest useful action here?",
    amount: 4,
    payable: 4,
    status: "real",
    note: "This stays on the bill because action is cheaper than spiraling.",
    argument: "One small action remains payable.",
    isOpen: false,
  });

  return {
    worry,
    tone,
    charges,
    action: getSuggestedAction(worry),
  };
}

function selectCharges(worry) {
  const normalized = worry.toLowerCase();
  const matched = chargeCatalog.filter((charge) =>
    charge.keywords.some((keyword) => normalized.includes(keyword))
  );

  const pool = matched.length >= 4
    ? matched
    : [...matched, ...fallbackCharges.map(findChargeById)];

  return uniqueById(pool).slice(0, 5);
}

function findChargeById(id) {
  return chargeCatalog.find((charge) => charge.id === id);
}

function uniqueById(charges) {
  const seen = new Set();
  return charges.filter((charge) => {
    if (!charge || seen.has(charge.id)) {
      return false;
    }
    seen.add(charge.id);
    return true;
  });
}

function renderReceipt() {
  receiptLines.innerHTML = "";

  activeReceipt.charges.forEach((charge) => {
    const line = document.createElement("section");
    line.className = "receipt-line";
    line.dataset.status = charge.status;

    const statusText = getStatusText(charge);
    const canAudit = charge.id !== "real-action";
    const auditLabel = charge.isOpen ? "Close audit" : "Audit charge";
    const inlineAudit = charge.isOpen ? buildInlineAudit(charge) : "";

    line.innerHTML = `
      <div class="line-main">
        <div class="line-name">
          <strong>${escapeHtml(charge.label)}</strong>
          <span>${escapeHtml(charge.trap)}</span>
        </div>
        <div class="line-amount">
          <span>${formatMoney(charge.payable)}</span>
        </div>
      </div>
      <p class="line-note">${escapeHtml(statusText)}</p>
      <div class="line-controls">
        ${canAudit ? `<button class="button secondary" type="button" data-audit="${charge.id}">${auditLabel}</button>` : ""}
      </div>
      ${inlineAudit}
    `;

    receiptLines.appendChild(line);
  });

  receiptLines.querySelectorAll("[data-audit]").forEach((button) => {
    button.addEventListener("click", () => toggleAudit(button.dataset.audit));
  });

  receiptLines.querySelectorAll("[data-verdict]").forEach((button) => {
    button.addEventListener("click", () => {
      applyVerdict(button.dataset.chargeId, button.dataset.verdict);
    });
  });

  updateTotals();
  updateAction();
}

function buildInlineAudit(charge) {
  const argumentId = `argument-${charge.id}`;

  return `
    <div class="inline-audit">
      <p class="inline-kicker">Dispute this charge</p>
      <p class="audit-question">${escapeHtml(charge.question)}</p>
      <div class="evidence-prompts">
        <p>Quick audit questions:</p>
        <ul>
          <li>Is this definitely real?</li>
          <li>What evidence do you actually have?</li>
          <li>Is this a thinking trap trying to look official?</li>
        </ul>
      </div>
      <label for="${argumentId}">Your counter-argument</label>
      <textarea
        id="${argumentId}"
        data-argument="${charge.id}"
        rows="3"
        placeholder="Example: I only know they have not replied yet. I do not know what they think."
      >${escapeHtml(charge.argument)}</textarea>
      <div class="challenge-actions">
        <button class="button discount" type="button" data-charge-id="${charge.id}" data-verdict="trap">
          Cross off as thinking trap
        </button>
        <button class="button discount" type="button" data-charge-id="${charge.id}" data-verdict="unproven">
          Discount as unproven
        </button>
        <button class="button keep" type="button" data-charge-id="${charge.id}" data-verdict="real">
          Keep as real
        </button>
      </div>
    </div>
  `;
}

function toggleAudit(chargeId) {
  const charge = activeReceipt.charges.find((item) => item.id === chargeId);
  const nextOpenState = !charge.isOpen;

  activeReceipt.charges.forEach((item) => {
    item.isOpen = item.id === chargeId ? nextOpenState : false;
  });

  renderReceipt();
}

function applyVerdict(chargeId, verdict) {
  const charge = activeReceipt.charges.find((item) => item.id === chargeId);
  const argumentInput = receiptLines.querySelector(`[data-argument="${chargeId}"]`);
  charge.argument = argumentInput ? argumentInput.value.trim() : "";

  if (verdict === "trap") {
    charge.status = "trap";
    charge.payable = 0;
    charge.note = charge.argument || "Crossed off: no receipt, no payment.";
  }

  if (verdict === "unproven") {
    charge.status = "unproven";
    charge.payable = roundMoney(charge.amount * 0.18);
    charge.note = charge.argument || "Discounted: possible, but not proven enough to pay full price.";
  }

  if (verdict === "real") {
    charge.status = "real";
    charge.payable = roundMoney(charge.amount * 0.72);
    charge.note = charge.argument || "Kept partially payable: real enough to handle, not big enough to dominate.";
  }

  charge.isOpen = false;
  renderReceipt();
}

function updateTotals() {
  const original = activeReceipt.charges.reduce((sum, charge) => sum + charge.amount, 0);
  const payable = activeReceipt.charges.reduce((sum, charge) => sum + charge.payable, 0);
  const discount = original - payable;

  originalTotal.textContent = formatMoney(original);
  discountTotal.textContent = `-${formatMoney(discount)}`;
  finalTotal.textContent = formatMoney(payable);
}

function updateAction() {
  const auditedCount = activeReceipt.charges.filter((charge) => charge.status !== "pending").length;
  const totalAuditable = activeReceipt.charges.length - 1;

  if (auditedCount >= Math.max(2, Math.ceil(totalAuditable / 2))) {
    actionCard.hidden = false;
    actionText.textContent = activeReceipt.action;
  }
}

function getToneNote(tone, chargeId) {
  const notes = {
    gentle: {
      "mind-reading": "This may be your brain trying to protect you with incomplete data.",
      "fortune-telling": "A prediction is not the same thing as a receipt.",
      catastrophe: "This charge may be inflated by urgency.",
      personalization: "Responsibility rarely belongs to one person only.",
      should: "Perfect performance is not the entry fee for being okay.",
      "emotional-reasoning": "The feeling deserves care, not automatic obedience.",
      control: "Some costs shrink when you stop paying for control you do not have.",
    },
    funny: {
      "mind-reading": "Telepathy department submitted no documents.",
      "fortune-telling": "Crystal ball maintenance fee denied.",
      catastrophe: "Emergency siren volume appears suspiciously high.",
      personalization: "The universe did not put only your name on the invoice.",
      should: "Perfection attempted to sneak in a luxury surcharge.",
      "emotional-reasoning": "Feelings arrived confidently, but without paperwork.",
      control: "Management fee for things you do not manage.",
    },
    firm: {
      "mind-reading": "Do not pay for a claim without evidence.",
      "fortune-telling": "The future has not sent a bill yet.",
      catastrophe: "Reduce this to the repairable facts.",
      personalization: "Only pay for your actual part.",
      should: "Replace the impossible standard with a useful one.",
      "emotional-reasoning": "Important feeling, insufficient proof.",
      control: "Pay only for what you can influence.",
    },
  };

  return notes[tone][chargeId];
}

function getStatusText(charge) {
  if (charge.status === "pending") {
    return charge.note;
  }

  if (charge.status === "trap") {
    return `DISCOUNT ACCEPTED: ${charge.note}`;
  }

  if (charge.status === "unproven") {
    return `PARTIAL DISCOUNT: ${charge.note}`;
  }

  return `PAYABLE: ${charge.note}`;
}

function getSuggestedAction(worry) {
  const normalized = worry.toLowerCase();

  if (["text", "reply", "message", "dm", "date"].some((word) => normalized.includes(word))) {
    return actions.text;
  }

  if (["work", "boss", "job", "presentation", "meeting", "email"].some((word) => normalized.includes(word))) {
    return actions.work;
  }

  if (["friend", "party", "plans", "social", "family"].some((word) => normalized.includes(word))) {
    return actions.social;
  }

  if (["money", "rent", "bill", "pay", "cost"].some((word) => normalized.includes(word))) {
    return actions.money;
  }

  return actions.default;
}

function buildReceiptText() {
  const original = activeReceipt.charges.reduce((sum, charge) => sum + charge.amount, 0);
  const payable = activeReceipt.charges.reduce((sum, charge) => sum + charge.payable, 0);
  const lines = activeReceipt.charges
    .map((charge) => `${charge.label}: ${formatMoney(charge.payable)} - ${getStatusText(charge)}`)
    .join("\n");

  return [
    "EMOTION RECEIPT",
    `Charge description: ${activeReceipt.worry}`,
    "",
    lines,
    "",
    `Original mental toll: ${formatMoney(original)}`,
    `Real payable cost: ${formatMoney(payable)}`,
    "",
    `Suggested action: ${activeReceipt.action}`,
  ].join("\n");
}

function formatMoney(value) {
  return `$${roundMoney(value).toFixed(2)}`;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function hashString(value) {
  return value.split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
