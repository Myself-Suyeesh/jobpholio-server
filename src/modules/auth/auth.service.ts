import { UserModel, IUser } from '../users/user.model.js';
import { AuthIdentityModel } from './auth-identity.model.js';
import { SessionModel, ISession } from './session.model.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema.js';
import { hashPassword, comparePassword, hashToken, generateRandomToken } from '../../shared/utils/crypto.js';
import { generateAccessToken } from './jwt.utils.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../shared/errors/app.error.js';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Helper to create a new session document for a user.
   */
  private static async createSession(userId: string, meta?: RequestMeta): Promise<{ session: ISession; refreshToken: string }> {
    const rawRefreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

    const session = await SessionModel.create({
      userId,
      refreshTokenHash,
      device: meta?.device || 'Unknown Device',
      browser: meta?.browser || 'Unknown Browser',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      expiresAt,
    });

    return { session, refreshToken: rawRefreshToken };
  }

  /**
   * Register a new user with email and password.
   */
  public static async register(input: RegisterInput, meta?: RequestMeta): Promise<AuthResponse> {
    const existingUser = await UserModel.findOne({ 'identity.email': input.email });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    // 1. Create User Document
    const user = await UserModel.create({
      identity: {
        name: input.name,
        email: input.email,
      },
    });

    // 2. Hash Password & Create AuthIdentity Document
    const passwordHash = await hashPassword(input.password);
    await AuthIdentityModel.create({
      userId: user._id,
      provider: 'password',
      providerAccountId: input.email,
      passwordHash,
    });

    // 3. Create Session & Issue Tokens
    const { refreshToken } = await this.createSession(user._id.toString(), meta);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.identity.email,
      name: user.identity.name,
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Authenticate an existing user with email and password.
   */
  public static async login(input: LoginInput, meta?: RequestMeta): Promise<AuthResponse> {
    const identity = await AuthIdentityModel.findOne({
      provider: 'password',
      providerAccountId: input.email,
    }).select('+passwordHash');

    if (!identity || !identity.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(input.password, identity.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = await UserModel.findById(identity.userId);
    if (!user) {
      throw new NotFoundError('Associated user profile not found');
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Create Session & Issue Tokens
    const { refreshToken } = await this.createSession(user._id.toString(), meta);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.identity.email,
      name: user.identity.name,
    });

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Rotates a refresh token: revokes old session and creates a new rotated session.
   */
  public static async refresh(refreshTokenStr: string, meta?: RequestMeta): Promise<AuthTokens> {
    const refreshTokenHash = hashToken(refreshTokenStr);

    const session = await SessionModel.findOne({
      refreshTokenHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid, expired, or revoked refresh token');
    }

    // Mark old session as revoked (Token Rotation)
    session.revokedAt = new Date();
    await session.save();

    const user = await UserModel.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError('User account associated with session no longer exists');
    }

    // Issue new session & rotated tokens
    const { refreshToken: newRefreshToken } = await this.createSession(user._id.toString(), meta);
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.identity.email,
      name: user.identity.name,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke session on logout.
   */
  public static async logout(refreshTokenStr?: string): Promise<void> {
    if (!refreshTokenStr) return;

    const refreshTokenHash = hashToken(refreshTokenStr);
    await SessionModel.findOneAndUpdate(
      { refreshTokenHash, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
  }

  /**
   * Change user password and revoke all active user sessions.
   */
  public static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const identity = await AuthIdentityModel.findOne({
      userId,
      provider: 'password',
    }).select('+passwordHash');

    if (!identity || !identity.passwordHash) {
      throw new BadRequestError('Password authentication is not configured for this account');
    }

    const isCurrentPasswordValid = await comparePassword(input.currentPassword, identity.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Update password hash
    identity.passwordHash = await hashPassword(input.newPassword);
    await identity.save();

    // Revoke all active sessions for security
    await SessionModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
  }

  /**
   * Retrieve active authentication identities for user.
   */
  public static async getUserIdentities(userId: string) {
    return AuthIdentityModel.find({ userId }).select('provider providerAccountId createdAt');
  }

  /**
   * Retrieve active sessions for user.
   */
  public static async getUserSessions(userId: string) {
    return SessionModel.find({ userId, revokedAt: { $exists: false } })
      .select('device browser ipAddress userAgent lastUsedAt createdAt')
      .sort({ lastUsedAt: -1 });
  }

  /**
   * Revoke specific session by ID.
   */
  public static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await SessionModel.findOneAndUpdate(
      { _id: sessionId, userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    if (!result) {
      throw new NotFoundError('Session not found or already revoked');
    }
  }

  /**
   * Revoke all active sessions for user.
   */
  public static async revokeAllSessions(userId: string): Promise<void> {
    await SessionModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
  }
}
