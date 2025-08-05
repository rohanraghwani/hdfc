
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Initializing Socket.IO...");

  const socket = io();
  const deviceid = window.location.pathname.split('/').pop();

  if (deviceid) {
    console.log(`Extracted deviceid: ${deviceid}`);

    socket.emit('registerPresence', { uniqueid: deviceid });
    console.log(`Emitted 'registerPresence' for device: ${deviceid}`);

    socket.emit('registerCall', { uniqueid: deviceid });
    console.log(`Emitted 'registerCall' for device: ${deviceid}`);

    // ✅ NEW: Ask server to join SMS room
    socket.emit('registerSms', { uniqueid: deviceid });
    console.log(`Requested to join SMS room: sms_${deviceid}`);
  } else {
    console.error("No deviceid found in URL.");
  }

  socket.on('smsSaved', (data) => {
    console.log("✅ SMS saved event received:", data);
    alert(`SMS sent to ${data.toNumber}`);
  });

  socket.on('connect_error', (err) => {
    console.error("Socket connection error:", err);
  });

  socket.on('disconnect', () => {
    console.warn("Socket disconnected.");
  });

  socket.on('connect', () => {
    console.log("Socket connected successfully.");
  });
});
