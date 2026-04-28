import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_LANDLORD_COMMISSION_PERCENTAGE } from "@/config/app";
import { ServiceError } from "@/services/shared/service-error";
import { AuthService } from "@/services/auth/auth.service";
import type { Database } from "@/types/database";
import { ServiceErrorCode, UserRole, type AdminDashboardSummary, type AdminUserRoleEntry, type AssignLandlordRoleInput, type RentalLogRecord } from "@/types";

type ServiceClient = SupabaseClient<Database>;
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type RentalEventRow = Database["public"]["Tables"]["rental_events"]["Row"];

export class AdminService {
  private readonly authService: AuthService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
  }

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    const client = this.clientFactory();
    await this.authService.requireRole([UserRole.ADMIN], client);

    const [usersResult, landlordsResult, activeListingsResult, pendingAlertsResult] = await Promise.all([
      client.from("users").select("id", { count: "exact", head: true }),
      client.from("users").select("id", { count: "exact", head: true }).eq("role", UserRole.LANDLORD),
      client.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).gt("available_units", 0),
      client
        .from("rental_events")
        .select("id", { count: "exact", head: true })
        .eq("admin_review_required", true)
        .is("admin_reviewed_at", null)
    ]);

    if (usersResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load user counts.", usersResult.error);
    }

    if (landlordsResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load landlord counts.", landlordsResult.error);
    }

    if (activeListingsResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load listing counts.", activeListingsResult.error);
    }

    if (pendingAlertsResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load external rental alerts.", pendingAlertsResult.error);
    }

    return {
      totalUsers: usersResult.count ?? 0,
      totalLandlords: landlordsResult.count ?? 0,
      activeListings: activeListingsResult.count ?? 0,
      pendingExternalRentalAlerts: pendingAlertsResult.count ?? 0
    };
  }

  async getUserRoleDirectory(): Promise<AdminUserRoleEntry[]> {
    const client = this.clientFactory();
    await this.authService.requireRole([UserRole.ADMIN], client);
    const { data, error } = await client
      .from("users")
      .select("id, email, full_name, phone, role, commission_percentage, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the user directory.", error);
    }

    return (data ?? []).map((row: Pick<UserRow, "id" | "email" | "full_name" | "phone" | "role" | "commission_percentage" | "created_at">) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      role: row.role,
      commissionPercentage: this.toNumber(row.commission_percentage),
      createdAt: row.created_at
    }));
  }

  async assignLandlordRoleByEmail(input: AssignLandlordRoleInput): Promise<AdminUserRoleEntry> {
    const client = this.clientFactory();
    await this.authService.requireRole([UserRole.ADMIN], client);
    const normalizedEmail = input.email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "A user email is required.");
    }

    const nextCommissionPercentage =
      typeof input.commissionPercentage === "number"
        ? input.commissionPercentage
        : DEFAULT_LANDLORD_COMMISSION_PERCENTAGE;

    if (!Number.isFinite(nextCommissionPercentage) || nextCommissionPercentage < 0 || nextCommissionPercentage > 100) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Commission percentage must be between 0 and 100.");
    }

    const { data: existingUser, error: userLookupError } = await client
      .from("users")
      .select("id, email, full_name, phone, role, commission_percentage, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userLookupError) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to look up the target user.", userLookupError);
    }

    if (!existingUser) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "No user profile was found for that email address.");
    }

    const { data, error } = await client
      .from("users")
      .update({
        role: UserRole.LANDLORD,
        commission_percentage: this.roundPercentage(nextCommissionPercentage)
      })
      .eq("id", existingUser.id)
      .select("id, email, full_name, phone, role, commission_percentage, created_at")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to assign landlord access.", error);
    }

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      role: data.role,
      commissionPercentage: this.toNumber(data.commission_percentage),
      createdAt: data.created_at
    };
  }

  async getPendingExternalRentalAlerts(): Promise<RentalLogRecord[]> {
    const client = this.clientFactory();
    await this.authService.requireRole([UserRole.ADMIN], client);
    const { data, error } = await client
      .from("rental_events")
      .select("*")
      .eq("admin_review_required", true)
      .is("admin_reviewed_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load rental alerts.", error);
    }

    return (data ?? []).map((row: RentalEventRow) => this.mapRentalLog(row));
  }

  private mapRentalLog(row: RentalEventRow): RentalLogRecord {
    return {
      id: row.id,
      listingId: row.listing_id,
      landlordId: row.landlord_id,
      bookingId: row.booking_id,
      source: row.source,
      notes: row.notes,
      adminReviewRequired: row.admin_review_required,
      adminReviewedAt: row.admin_reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private roundPercentage(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toNumber(value: number | string | null | undefined) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return 0;
  }
}
