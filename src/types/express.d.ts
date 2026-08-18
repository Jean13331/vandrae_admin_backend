import type { AdminUser } from '../repositories/adminUser.repository'

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser
    }
  }
}

export {}
