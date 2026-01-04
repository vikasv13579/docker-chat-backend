const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const onboardingController = require('./controllers/onboardingController');
const { verifyToken } = require('./middleware/auth');

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.me);

// Onboarding Routes
router.post('/onboarding/draft', verifyToken, onboardingController.saveDraft);
router.get('/onboarding/status', verifyToken, onboardingController.getOnboardingStatus);
router.post('/onboarding/submit', verifyToken, onboardingController.submitForm);

// Chat Routes
const chatController = require('./controllers/chatController');
router.get('/chat/rooms', verifyToken, chatController.getMyRooms);
router.get('/chat/rooms/:roomId/messages', verifyToken, chatController.getChatHistory);
router.post('/chat/rooms', verifyToken, chatController.createRoom);

// Data Routes
const doctorController = require('./controllers/doctorController');
router.get('/doctors', verifyToken, doctorController.listDoctors);

module.exports = router;
