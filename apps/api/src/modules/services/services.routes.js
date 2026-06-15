const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { success } = require('../../utils/response');

// Static service catalog — extend with DB-driven pricing later
router.get('/', authenticate, (req, res) => {
  const services = [
    { id: 'airtime', name: 'Airtime', icon: 'phone', category: 'vtu', providers: ['MTN', 'Airtel', 'Glo', '9mobile'] },
    { id: 'data', name: 'Data', icon: 'wifi', category: 'vtu', providers: ['MTN', 'Airtel', 'Glo', '9mobile'] },
    { id: 'cable', name: 'Cable TV', icon: 'tv', category: 'bills', providers: ['DSTV', 'GOTV', 'STARTIMES'] },
    { id: 'electricity', name: 'Electricity', icon: 'zap', category: 'bills', providers: ['IKEDC', 'EKEDC', 'AEDC', 'KAEDC', 'JED', 'PHEDC', 'KEDCO', 'BEDC'] },
    { id: 'exam', name: 'Exam Pins', icon: 'book', category: 'education', providers: ['WAEC', 'NECO', 'NABTEB', 'JAMB'] },
  ];
  return success(res, { services }, 'Services fetched');
});

module.exports = router;
