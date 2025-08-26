const express = require('express');
const router = express.Router();
const roles = require('../controllers/rolesController');

router.get('/', roles.getAll);

module.exports = router;
