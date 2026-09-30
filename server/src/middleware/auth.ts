import { Request, Response, NextFunction } from 'express';
import { dbService } from '../db/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication Middleware for Multi-Tenant Isolation
 * Extracts Bearer token, verifies active session, and attaches req.user
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is required.' });
  }

  const user = dbService.getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Session has expired or is invalid. Please log in again.' });
  }

  req.user = user;
  next();
}

/**
 * Optional authentication middleware: attaches user if token exists, but does not block if not
 */
export function optionalAuthenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    const user = dbService.getSessionUser(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}
