import { Router } from 'express';
import certRoutes from './certs';
import pingRoutes from './ping';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use('/certs', authenticate, certRoutes);
router.use('/ping', pingRoutes);

export default router;
