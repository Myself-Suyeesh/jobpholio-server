import { IUser, UserModel } from '../users/user.model.js';
import { AuthIdentityModel } from '../auth/auth-identity.model.js';
import { UpdateProfileInput } from './profile.schema.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app.error.js';

export interface ProfileCompletionBreakdown {
  personalInfo: boolean;
  professionalDetails: boolean;
  jobPreferences: boolean;
  hasDefaultDocument: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  breakdown: ProfileCompletionBreakdown;
}

const isFilled = (value?: string): boolean => Boolean(value && value.trim().length > 0);

export class ProfileService {
  public static async getProfile(userId: string): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundError('User profile not found');
    }
    return user;
  }

  public static async updateProfile(userId: string, input: UpdateProfileInput): Promise<IUser> {
    const user = await this.getProfile(userId);

    if (input.identity) {
      if (input.identity.name !== undefined) {
        user.identity.name = input.identity.name;
      }

      if (input.identity.avatarUrl !== undefined) {
        user.identity.avatarUrl = input.identity.avatarUrl || undefined;
      }

      if (input.identity.email !== undefined && input.identity.email !== user.identity.email) {
        const existingUser = await UserModel.findOne({
          'identity.email': input.identity.email,
          _id: { $ne: user._id },
        });
        if (existingUser) {
          throw new ConflictError('An account with this email address already exists');
        }

        user.identity.email = input.identity.email;
        await AuthIdentityModel.updateOne(
          { userId: user._id, provider: 'password' },
          { $set: { providerAccountId: input.identity.email } }
        );
      }
    }

    if (input.profile) {
      if (input.profile.phone !== undefined) user.profile.phone = input.profile.phone || undefined;
      if (input.profile.location !== undefined) user.profile.location = input.profile.location || undefined;
      if (input.profile.timezone !== undefined) user.profile.timezone = input.profile.timezone;
      if (input.profile.bio !== undefined) user.profile.bio = input.profile.bio || undefined;
    }

    if (input.professional) {
      if (input.professional.headline !== undefined) {
        user.professional.headline = input.professional.headline || undefined;
      }
      if (input.professional.yearsOfExperience !== undefined) {
        user.professional.yearsOfExperience = input.professional.yearsOfExperience;
      }
      if (input.professional.skills !== undefined) {
        user.professional.skills = input.professional.skills;
      }
      if (input.professional.summary !== undefined) {
        user.professional.summary = input.professional.summary || undefined;
      }
    }

    if (input.jobPreferences) {
      if (input.jobPreferences.roles !== undefined) {
        user.jobPreferences.roles = input.jobPreferences.roles;
      }
      if (input.jobPreferences.locations !== undefined) {
        user.jobPreferences.locations = input.jobPreferences.locations;
      }
      if (input.jobPreferences.workTypes !== undefined) {
        user.jobPreferences.workTypes = input.jobPreferences.workTypes;
      }
      if (input.jobPreferences.industries !== undefined) {
        user.jobPreferences.industries = input.jobPreferences.industries;
      }
      if (input.jobPreferences.weeklyApplicationGoal !== undefined) {
        user.jobPreferences.weeklyApplicationGoal = input.jobPreferences.weeklyApplicationGoal;
      }
    }

    await user.save();
    return user;
  }

  public static async getCompletion(userId: string): Promise<ProfileCompletion> {
    const user = await this.getProfile(userId);
    const breakdown = this.calculateBreakdown(user);
    const completedCount = Object.values(breakdown).filter(Boolean).length;
    const percentage = Math.round((completedCount / Object.keys(breakdown).length) * 100);

    return { percentage, breakdown };
  }

  /**
   * Derived completion flags. `hasDefaultDocument` stays false until Phase 11 documents exist.
   */
  public static calculateBreakdown(user: IUser): ProfileCompletionBreakdown {
    const personalInfo =
      isFilled(user.identity.name) &&
      isFilled(user.identity.email) &&
      isFilled(user.profile.phone) &&
      isFilled(user.profile.location);

    const professionalDetails =
      isFilled(user.professional.headline) &&
      Array.isArray(user.professional.skills) &&
      user.professional.skills.length > 0;

    const jobPreferences =
      user.jobPreferences.roles.length > 0 &&
      user.jobPreferences.locations.length > 0 &&
      user.jobPreferences.workTypes.length > 0;

    return {
      personalInfo,
      professionalDetails,
      jobPreferences,
      hasDefaultDocument: false,
    };
  }
}
