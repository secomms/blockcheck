const express = require('express');
const router = express.Router();
const multer = require('multer');
const {processPDFBase64} = require("../utils/pdfVerifier");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', function(req, res, next) {
    res.render('pages/index', {
        title: 'Home',
        message: '',
    });
});

router.get('/verifier', function(req, res, next) {
    res.render('pages/verifier', {
        title: 'Upload and verify'
    });
});

router.get('/learn-more', function(req, res, next) {
    res.render('pages/howitworks', {
        title: 'How it works'
    });
});

// Upload PDF in memoria
router.post('/uploadAndVerify', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.render('pages/index', {title: 'Upload PDF', message: 'No file selected'});
    }

    const pdfBase64 = Buffer.from(req.file.buffer, 'base64')

    const result = await processPDFBase64(pdfBase64);

    if (!result.success) {
        return res.render('pages/error', {title: 'Error', message: result.error});
    }

    res.render('pages/verificationResult', {title: 'Verification result', message: result.response});
});

module.exports = router;
