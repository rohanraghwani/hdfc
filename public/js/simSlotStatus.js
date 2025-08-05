document.addEventListener('DOMContentLoaded', () => {
  const socket = io({
    transports: ['websocket'],
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 10000
  });

  const POLL_INTERVAL = 2000;
  const MAX_POLL_DURATION = 15000; // 15s max
  let pollingIntervalId = null;
  let pollingTimeoutId = null;

  const activeForm = document.getElementById('startForm');
  const stopForm = document.getElementById('stopForm');

  const deviceId = activeForm?.action?.split('/')?.pop(); // Get <%= device._id %>
  const getStatusUrl = `/api/device/status/${deviceId}`;

  const startPolling = (actionTypeExpected) => {
    console.log(`[simSlotStatus] ⏱ Starting polling expecting: ${actionTypeExpected} (2s interval, max 15s)`);

    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      console.log(`[simSlotStatus] 🔁 Previous polling cleared`);
    }

    if (pollingTimeoutId) {
      clearTimeout(pollingTimeoutId);
    }

    let elapsedTime = 0;

    pollingIntervalId = setInterval(async () => {
      elapsedTime += POLL_INTERVAL;

      console.log(`[simSlotStatus] 🔁 Polling DB for UID=${deviceId}... (Elapsed: ${elapsedTime / 1000}s)`);

      try {
        const res = await fetch(getStatusUrl);
        const data = await res.json();
        const status = data?.status;

        if (!status) {
          console.warn('[simSlotStatus] ⚠️ No status found in response');
          return;
        }

        ['1', '2'].forEach((slot) => {
          const el = document.querySelector(`.green-ball[data-id="${deviceId}"][data-slot="${slot}"]`);
          if (!el) return;

          const current = status[slot];
          if (current) {
            const color = current === 'register' ? 'green' : 'red';
            el.style.backgroundColor = color;

            const ts = new Date().toLocaleString();
            el.title = `Last action: ${current} at ${ts}`;

            console.log(`[simSlotStatus] ✅ Updated → uid=${deviceId}, slot=${slot}, action=${current}, time=${ts}`);
          }
        });

        const foundMatch = Object.values(status).some(val => val === actionTypeExpected);
        if (foundMatch) {
          clearInterval(pollingIntervalId);
          clearTimeout(pollingTimeoutId);
          pollingIntervalId = null;
          pollingTimeoutId = null;
          console.log(`[simSlotStatus] 🛑 Polling stopped early — expected action '${actionTypeExpected}' matched`);
        }
      } catch (err) {
        console.error('[simSlotStatus] ❌ Poll error:', err);
      }

      if (elapsedTime >= MAX_POLL_DURATION) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
        console.warn(`[simSlotStatus] ⌛ Max 15s reached — polling auto-stopped. No DB change for '${actionTypeExpected}'`);
      }
    }, POLL_INTERVAL);

    // Also set a hard timeout fallback (optional)
    pollingTimeoutId = setTimeout(() => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
        console.warn(`[simSlotStatus] ⌛ Timeout hit — polling forcibly stopped after 15s`);
      }
    }, MAX_POLL_DURATION + 500); // little buffer
  };

  // Restore polling if last action is saved in localStorage
  const lastAction = localStorage.getItem('lastSimAction');
  if (lastAction && deviceId) {
    console.log(`[simSlotStatus] ♻️ Resuming polling from localStorage → ${lastAction}`);
    startPolling(lastAction);
  }

  // Attach submit listeners to forms
  if (activeForm) {
    activeForm.addEventListener('submit', () => {
      console.log('[simSlotStatus] 👉 Clicked ACTIVE');
      localStorage.setItem('lastSimAction', 'register');
      startPolling('register');
    });
  } else {
    console.warn('[simSlotStatus] ❌ startForm not found');
  }

  if (stopForm) {
    stopForm.addEventListener('submit', () => {
      console.log('[simSlotStatus] 👉 Clicked DEACTIVE');
      localStorage.setItem('lastSimAction', 'erase');
      startPolling('erase');
    });
  } else {
    console.warn('[simSlotStatus] ❌ stopForm not found');
  }

  // Real-time socket update fallback
  socket.on('connect', () => console.log('[simSlotStatus] ✅ Socket connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[simSlotStatus] 🔌 Socket disconnected:', reason));

  socket.on('simSlotUpdate', (data) => {
    const { uniqueid, simSlot, actionType, timestamp } = data;
    if (!uniqueid || simSlot == null || !actionType) return;

    const selector = `.green-ball[data-id="${uniqueid}"][data-slot="${String(simSlot)}"]`;
    const el = document.querySelector(selector);
    const tsString = timestamp ? new Date(timestamp).toLocaleString() : 'N/A';

    if (el) {
      const color = actionType === 'register' ? 'green' : 'red';
      el.style.backgroundColor = color;
      el.title = `Last action: ${actionType} at ${tsString}`;
      console.log(`[simSlotStatus] 🔔 Realtime Update → uid=${uniqueid}, slot=${simSlot}, action=${actionType}, time=${tsString}`);
    } else {
      console.warn(`[simSlotStatus] ⚠️ Element not found for uid=${uniqueid}, slot=${simSlot}`);
    }
  });
});
