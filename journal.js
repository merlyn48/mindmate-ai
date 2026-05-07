/* ──────────────────────────────────────
   DAILY PROMPTS
────────────────────────────────────── */

const prompts = [
  "What drained your energy today?",
  "What made you smile today?",
  "What emotion stayed with you the longest?",
  "What’s one thing you need right now?",
  "What’s something you handled well today?",
  "What thoughts keep repeating lately?",
  "What would comfort you tonight?"
];

function loadPrompt() {
  const promptEl = document.getElementById("dailyPrompt");

  const random = prompts[
    Math.floor(Math.random() * prompts.length)
  ];

  promptEl.textContent = "🌿 " + random;
}

loadPrompt();
