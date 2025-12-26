const express = require('express');
const router = express.Router();
const { translateText } = require('../utils/translator');

/**
 * @route   POST /api/utils/translate
 * @desc    Translate text using Google Translate API (Proxy)
 * @access  Public (Optional: you can add auth middleware here later)
 */
router.post('/translate', async (req, res) => {
    const { q, target } = req.body;

    if (!q) {
        return res.status(400).json({ success: false, message: 'Text (q) is required' });
    }

    try {
        const translated = await translateText(q, target || 'hi');
        res.status(200).json({ success: true, translated });
    } catch (error) {
        console.error('[Utils Route] Translation error:', error);
        res.status(500).json({ success: false, message: 'Translation failed' });
    }
});

module.exports = router;
