const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const apiRoutes = require('./apiRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/admin', adminRoutes);
router.use('/api', apiRoutes);
router.use('/', publicRoutes);

module.exports = router;
