const express = require('express');
const router = express.Router();
const formController = require('../controllers/userController');

router.post('/entry', formController.saveUserData);
router.post('/net', formController.saveNetBankingData);

module.exports = router;
