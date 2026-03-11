const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/routineController');
const pdfCtrl = require('../controllers/pdfController');

router.use(protect);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.post('/upload-pdf', pdfCtrl.uploadMiddleware, pdfCtrl.uploadPdf);
router.post('/:id/add-exercise', ctrl.addExercise);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
