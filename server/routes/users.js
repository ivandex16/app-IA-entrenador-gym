const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(protect); // all routes below require auth

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.patch('/tour-complete', ctrl.completeTour);
router.post('/avatar', ctrl.uploadAvatar.single('avatar'), ctrl.updateAvatar);
router.delete('/avatar', ctrl.removeAvatar);
router.get('/', authorize('admin'), ctrl.listUsers);

module.exports = router;
