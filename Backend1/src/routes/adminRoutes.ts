import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { verifyToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/stats', adminController.getPlatformStats);

router.get('/users', adminController.listUsers);
router.patch('/users/:id/ban', adminController.banUser);

router.get('/vendors', adminController.listVendors);
router.patch('/vendors/:id/status', adminController.toggleVendorStatus);

router.get('/orders', adminController.getOrders);
router.patch('/orders/:id/status', adminController.forceUpdateOrderStatus);

router.get('/complaints', adminController.getComplaints);
router.patch('/complaints/:id/resolve', adminController.resolveComplaint);

router.get('/delivery-issues', adminController.getDeliveryIssues);
router.patch('/delivery-issues/:id', adminController.updateDeliveryIssue);

router.get('/export/users', adminController.exportUsersCSV);
router.get('/export/vendors', adminController.exportVendorsCSV);
router.get('/export/orders', adminController.exportOrdersCSV);

export default router;
