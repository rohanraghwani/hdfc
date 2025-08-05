document.addEventListener('DOMContentLoaded', () => {
  const socket = io({
    transports: ['websocket'],
    path: '/socket.io',
    query: { clientType: 'dashboard' },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 10000
  });

  const statusCache = new Map();
  const container = document.getElementById('deviceContainer');
  const countBox = document.getElementById("userCountBox");
  const statsBox = document.getElementById("statsBox");
  const onlineCountEl = document.getElementById("onlineCount");
  const offlineCountEl = document.getElementById("offlineCount");
  const totalCountEl = document.getElementById("totalCount");

  // Safety check for required elements
  if (!container || !countBox || !statsBox || !onlineCountEl || !offlineCountEl || !totalCountEl) {
    console.error('Required DOM elements missing');
    return;
  }

  function updateCounts() {
    const userCards = container.querySelectorAll(".device-card");
    const onlineCards = [...userCards].filter(card => card.dataset.status?.toLowerCase() === "online");
    const offlineCards = [...userCards].filter(card => card.dataset.status?.toLowerCase() === "offline");

    countBox.innerText = userCards.length;
    totalCountEl.innerText = userCards.length;
    onlineCountEl.innerText = onlineCards.length;
    offlineCountEl.innerText = offlineCards.length;
  }

  function updateCard(id, isOnline) {
    let card = container.querySelector(`.device-card[data-id="${id}"]`);
    if (!card) {
      statusCache.set(id, isOnline);
      return;
    }

    const statusEl = card.querySelector('.device-status');
    if (!statusEl) return;

    statusEl.classList.toggle('status-online', isOnline);
    statusEl.classList.toggle('status-offline', !isOnline);
    statusEl.textContent = `Status – ${isOnline ? 'Online' : 'Offline'}`;

    card.dataset.status = isOnline ? 'online' : 'offline';
    statusCache.set(id, isOnline);

    updateCounts();
  }

  function addDeviceCard(dev) {
    let existing = container.querySelector(`.device-card[data-id="${dev.uniqueid}"]`);
    const isOnline = statusCache.has(dev.uniqueid)
      ? statusCache.get(dev.uniqueid)
      : dev.connectivity === 'Online' || dev.connectivity === true;

    if (existing) {
      updateCard(dev.uniqueid, isOnline);
      return;
    }

    const el = document.createElement('div');
    el.className = 'device-card';
    el.dataset.id = dev.uniqueid;
    el.dataset.status = isOnline ? 'online' : 'offline';
    el.style.display = "flex";

    el.innerHTML = `
      <div class="delete-icon" title="Delete Device" data-id="${dev.uniqueid}">&#128465;</div>
      <div class="device-content">
        <img src="/images/user-icon.png" alt="User Icon" />
        <div class="device-details">
          <h2>Brand: ${dev.brand || "Unknown"}</h2>
          <p><strong>ID:</strong> ${dev.uniqueid}</p>
        </div>
      </div>
      <div class="device-status ${isOnline ? 'status-online' : 'status-offline'}">
        Status – ${isOnline ? 'Online' : 'Offline'}
      </div>`;

    container.appendChild(el);
    updateCounts();
  }

  // Filter devices on stats box card click
  statsBox.addEventListener("click", (e) => {
    const filter = e.target.closest(".stats-card")?.dataset.filter;
    if (!filter) return;

    const userCards = container.querySelectorAll(".device-card");
    userCards.forEach(card => {
      const status = card.dataset.status?.toLowerCase();
      card.style.display = (filter === "all" || status === filter) ? "flex" : "none";
    });
  });

  // Toggle stats box visibility on countBox click
  countBox.addEventListener("click", () => {
    if (statsBox.classList.contains("hidden")) {
      statsBox.classList.remove("hidden");
      statsBox.classList.add("visible");
    } else {
      statsBox.classList.add("hidden");
      statsBox.classList.remove("visible");
    }
  });

  // Menu toggle (optional, based on your HTML)
  const menuIcon = document.querySelector(".menu-icon");
  const navLinks = document.querySelector(".nav-links");
  if (menuIcon && navLinks) {
    menuIcon.addEventListener("click", e => {
      e.stopPropagation();
      navLinks.classList.toggle("active");
      menuIcon.classList.toggle("rotate");
    });

    document.addEventListener("click", e => {
      if (!navLinks.contains(e.target) && !menuIcon.contains(e.target)) {
        navLinks.classList.remove("active");
        menuIcon.classList.remove("rotate");
      }
    });
  }

  // Device card click: redirect except if delete icon clicked
  container.addEventListener('click', e => {
    let el = e.target;
    while (el && !el.classList.contains('device-card')) {
      el = el.parentElement;
    }
    if (el && !e.target.classList.contains('delete-icon')) {
      window.location.href = `/api/device/admin/phone/${el.dataset.id}`;
    }
  });

  // Socket events
  socket.on('connect', () => console.log('Connected to server:', socket.id));
  socket.on('connect_error', err => console.error('Socket error:', err));
  socket.on('disconnect', reason => console.log('Disconnected:', reason));

  socket.on('userOnline', ({ uniqueid }) => {
    console.log('User online:', uniqueid);
    updateCard(uniqueid, true);
  });

  socket.on('userOffline', ({ uniqueid }) => {
    console.log('User offline:', uniqueid);
    updateCard(uniqueid, false);
  });

  socket.on('batteryUpdate', updates => {
    if (!Array.isArray(updates)) return;
    updates.forEach(({ uniqueid, connectivity }) => {
      const isOnline = connectivity === true || connectivity.toString().toLowerCase() === 'online';
      updateCard(uniqueid, isOnline);
    });
  });

  socket.on('newDevice', dev => {
    console.log('New device received:', dev);
    addDeviceCard(dev);
  });

  updateCounts();

  // Delete modal logic
  let selectedDeviceId = null;
  const modal = document.getElementById('deleteModal');
  const passwordInput = document.getElementById('deletePassword');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  if (container && modal && passwordInput && confirmBtn) {
    container.addEventListener('click', e => {
      const icon = e.target.closest('.delete-icon');
      if (icon) {
        e.stopPropagation();
        selectedDeviceId = icon.dataset.id;
        passwordInput.value = '';
        modal.classList.remove('hidden');
      }
    });

    confirmBtn.addEventListener('click', () => {
      const password = passwordInput.value.trim();
      if (!password) {
        alert('Password is required');
        return;
      }

      fetch(`/api/device/delete/${selectedDeviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        const card = container.querySelector(`.device-card[data-id="${selectedDeviceId}"]`);
        if (card) card.remove();
        modal.classList.add('hidden');
        updateCounts();
      })
      .catch(() => alert('Incorrect password or server error.'));
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  } else {
    console.warn('Delete modal or elements missing');
  }

  // Set password modal logic
  const setPasswordModal = document.getElementById('setPasswordModal');
  const openSetPasswordBtn = document.getElementById('openSetPasswordModal');
  const confirmSetBtn = document.getElementById('confirmSetBtn');
  const oldPwdInput = document.getElementById('oldDeletePassword');
  const newPwdInput = document.getElementById('newDeletePassword');

  if (setPasswordModal && openSetPasswordBtn && confirmSetBtn && oldPwdInput && newPwdInput) {
    openSetPasswordBtn.addEventListener('click', () => {
      setPasswordModal.classList.toggle('hidden');
    });

    confirmSetBtn.addEventListener('click', async () => {
      const oldPassword = oldPwdInput.value.trim();
      const newPassword = newPwdInput.value.trim();

      if (!oldPassword || !newPassword) {
        alert('Both old and new passwords are required.');
        return;
      }

      try {
        const res = await fetch('/api/device/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();

        if (data.success) {
          alert('Password updated successfully.');
          setPasswordModal.classList.add('hidden');
          oldPwdInput.value = '';
          newPwdInput.value = '';
        } else {
          alert(data.error || 'Failed to update password.');
        }
      } catch (err) {
        alert('Network error or server unavailable.');
        console.error(err);
      }
    });

    setPasswordModal.addEventListener('click', (e) => {
      if (e.target === setPasswordModal) {
        setPasswordModal.classList.add('hidden');
      }
    });
  } else {
    console.warn('Set password modal or elements missing');
  }
});
