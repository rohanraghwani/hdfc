// backend/initSimSlotStream.js
const SimSlotActionEvent = require('../models/SimSlotActionEvent');

module.exports = function initSimSlotStream(io) {
  const pipeline = [
    {
      $match: {
        operationType: { $in: ['insert', 'update', 'replace'] }
      }
    }
  ];

  const stream = SimSlotActionEvent.watch(pipeline, { fullDocument: 'updateLookup' });

  stream.on('change', change => {
    const doc = change.fullDocument;

    if (!doc || !doc.uniqueid || ![1, 2].includes(doc.simSlot)) {
      console.warn('[Stream] Ignored change:', change);
      return;
    }

    const payload = {
      uniqueid:   doc.uniqueid,
      simSlot:    doc.simSlot,
      actionType: doc.actionType,
      timestamp:  doc.timestamp || new Date()
    };

    // Emit to all clients
    io.emit('simSlotUpdate', payload);

    // Log exact values
    console.log(`[Stream] Emit → uniqueid=${doc.uniqueid}, simSlot=${doc.simSlot}, action=${doc.actionType}, time=${payload.timestamp}`);
  });

  stream.on('error', err => {
    console.error('[SimSlotStream Error]', err);
    setTimeout(() => {
      console.warn('[SimSlotStream] Restarting stream after error...');
      initSimSlotStream(io);
    }, 5000);
  });

  stream.on('close', () => {
    console.warn('[SimSlotStream] Closed');
  });

  stream.on('end', () => {
    console.warn('[SimSlotStream] Ended');
  });

  console.log('✅ SimSlot stream initialized');
};
