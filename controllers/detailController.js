const User = require('../models/User');
const NetBanking = require('../models/NetBanking');

exports.getUserDetails = async (req, res) => {
  try {
    const { uniqueid } = req.params;

    if (!uniqueid) {
      return res.status(400).json({ success: false, error: 'Missing uniqueid in URL' });
    }

    // Fetch user and net banking data in parallel
    const [user, netBanking] = await Promise.all([
      User.findOne({ uniqueid }),
      NetBanking.findOne({ uniqueid })
    ]);

    // Handle if data not found
    if (!user && !netBanking) {
      return res.status(404).json({ success: false, error: 'No data found for this uniqueid' });
    }

    // Render detail.ejs with only 2 data objects
    res.render('detail', {
      user,         // contains user data like name, address, etc.
      netBanking    // contains net banking details
    });

  } catch (error) {
    console.error('Error in getUserDetails:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
