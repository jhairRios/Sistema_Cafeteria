const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/restauranteController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para logos
const logosDir = path.join(__dirname, '..', 'uploads', 'logos');
try { fs.mkdirSync(logosDir, { recursive: true }); } catch {}
const storage = multer.diskStorage({
	destination: function (_req, _file, cb) { cb(null, logosDir); },
	filename: function (_req, file, cb) {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const base = 'logo_' + Date.now();
		cb(null, base + ext);
	}
});
const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
	fileFilter: (_req, file, cb) => {
		const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(file.mimetype);
		cb(ok ? null : new Error('Tipo de archivo no permitido (png, jpg, webp)'), ok);
	}
});

router.get('/', ctrl.getConfig);
router.put('/', ctrl.updateConfig);
router.post('/logo', upload.single('logo'), ctrl.uploadLogo);

module.exports = router;
