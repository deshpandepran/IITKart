import { Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';

export const createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, currency, orderId } = req.body;
    
    // Check if order belongs to user
    const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!dbOrder || dbOrder.userId !== req.user.id) {
      return next(new AppError('Invalid order', 400));
    }

    const order = await paymentService.createRazorpayOrder(amount, currency);
    
    res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        amount,
        currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) { next(error); }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId, method } = req.body;

    const isValid = paymentService.verifyRazorpaySignature(razorpayPaymentId, razorpayOrderId, razorpaySignature);
    if (!isValid) return next(new AppError('Invalid signature', 400));

    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        paymentStatus: 'success',
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        method
      }
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'success' }
    });

    res.status(200).json({ success: true, message: 'Payment verified' });
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: payments });
  } catch (error) { next(error); }
};

export const getReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });
    
    if (!order) return next(new AppError('Order not found', 404));

    const receipt = paymentService.generateReceipt(order);
    res.status(200).json({ success: true, data: { receipt } });
  } catch (error) { next(error); }
};
