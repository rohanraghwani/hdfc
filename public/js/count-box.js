document.addEventListener("DOMContentLoaded", () => {
  const countBox = document.getElementById("userCountBox");
  const statsBox = document.getElementById("statsBox");
  const userCards = document.querySelectorAll(".device-card");

  // Fix: Case-insensitive status checks
  const onlineCards = [...userCards].filter(card => card.dataset.status?.toLowerCase() === "online");
  const offlineCards = [...userCards].filter(card => card.dataset.status?.toLowerCase() === "offline");

  countBox.innerText = userCards.length;
  document.getElementById("totalCount").innerText = userCards.length;
  document.getElementById("onlineCount").innerText = onlineCards.length;
  document.getElementById("offlineCount").innerText = offlineCards.length;

  countBox.addEventListener("click", () => {
    statsBox.classList.toggle("hidden");
    statsBox.classList.toggle("visible");
  });

  statsBox.addEventListener("click", (e) => {
    const filter = e.target.closest(".stats-card")?.dataset.filter;
    if (!filter) return;

    userCards.forEach(card => {
      const status = card.dataset.status?.toLowerCase();
      if (filter === "all" || status === filter) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  });
});
