const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/backupController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadDir),
	filename: (_req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

router.get('/', ctrl.list);
router.post('/create', ctrl.createNow);
router.get('/download/:file', ctrl.download);
router.post('/restore', ctrl.restore); // espera { file }
router.post('/restore-defaults', ctrl.restoreDefaults);
router.post('/schedule', ctrl.schedule);
router.post('/upload', upload.single('file'), (req, res) => {
	res.json({ ok: true, file: req.file?.filename });
});

module.exports = router;
