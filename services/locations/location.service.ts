import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { AuthService } from "@/services/auth/auth.service";
import { ServiceError } from "@/services/shared/service-error";
import type { Database } from "@/types/database";
import { ServiceErrorCode, UserRole, type CreateManagedLocationInput, type ListingLocationCatalog, type ManagedLocationRecord } from "@/types";

type ServiceClient = SupabaseClient<Database>;
type CountyRow = Database["public"]["Tables"]["counties"]["Row"];
type TownRow = Database["public"]["Tables"]["towns"]["Row"];
type AreaRow = Database["public"]["Tables"]["areas"]["Row"];

export class LocationService {
  private readonly authService: AuthService;

  constructor(private readonly clientFactory: () => ServiceClient) {
    this.authService = new AuthService(clientFactory);
  }

  async getLocationCatalog(): Promise<ListingLocationCatalog> {
    if (!isSupabaseConfigured()) {
      return {
        counties: [],
        towns: [],
        areas: []
      };
    }

    const client = this.clientFactory();
    const [countiesResult, townsResult, areasResult] = await Promise.all([
      client.from("counties").select("id,name").order("name", { ascending: true }),
      client.from("towns").select("id,name,county_id").order("name", { ascending: true }),
      client.from("areas").select("id,name,town_id").order("name", { ascending: true })
    ]);

    if (countiesResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load counties.", countiesResult.error);
    }

    if (townsResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load towns.", townsResult.error);
    }

    if (areasResult.error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load areas.", areasResult.error);
    }

    return {
      counties: (countiesResult.data ?? []).map((county: Pick<CountyRow, "id" | "name">) => ({
        id: county.id,
        name: county.name
      })),
      towns: (townsResult.data ?? []).map((town: Pick<TownRow, "id" | "name" | "county_id">) => ({
        id: town.id,
        countyId: town.county_id,
        name: town.name
      })),
      areas: (areasResult.data ?? []).map((area: Pick<AreaRow, "id" | "name" | "town_id">) => ({
        id: area.id,
        townId: area.town_id,
        name: area.name
      }))
    };
  }

  async createManagedLocation(input: CreateManagedLocationInput): Promise<ManagedLocationRecord> {
    const client = this.clientFactory();
    await this.authService.requireRole([UserRole.ADMIN], client);
    const countyId = this.normalizePositiveInteger(input.countyId, "county");
    const areaName = input.areaName.trim();

    if (!areaName) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Area name is required.");
    }

    const county = await this.requireCounty(client, countyId);
    const town = await this.resolveTown(client, county.id, input.townId, input.townName);
    const area = await this.resolveArea(client, town.id, areaName);

    return {
      county: {
        id: county.id,
        name: county.name
      },
      town: {
        id: town.id,
        countyId: town.county_id,
        name: town.name
      },
      area: {
        id: area.id,
        townId: area.town_id,
        name: area.name
      }
    };
  }

  private async requireCounty(client: ServiceClient, countyId: number) {
    const { data, error } = await client.from("counties").select("id,name").eq("id", countyId).maybeSingle();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the selected county.", error);
    }

    if (!data) {
      throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The selected county does not exist.");
    }

    return data;
  }

  private async resolveTown(
    client: ServiceClient,
    countyId: number,
    townId: number | undefined,
    townName: string | undefined
  ) {
    if (typeof townId === "number") {
      const normalizedTownId = this.normalizePositiveInteger(townId, "town");
      const { data, error } = await client
        .from("towns")
        .select("id,name,county_id")
        .eq("id", normalizedTownId)
        .eq("county_id", countyId)
        .maybeSingle();

      if (error) {
        throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to load the selected town.", error);
      }

      if (!data) {
        throw new ServiceError(ServiceErrorCode.NOT_FOUND, "The selected town does not exist in that county.");
      }

      return data;
    }

    const normalizedTownName = townName?.trim();

    if (!normalizedTownName) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, "Select or enter a town.");
    }

    const existingTown = await this.findTownByName(client, countyId, normalizedTownName);

    if (existingTown) {
      return existingTown;
    }

    const { data, error } = await client
      .from("towns")
      .insert({
        county_id: countyId,
        name: normalizedTownName
      })
      .select("id,name,county_id")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the town.", error);
    }

    return data;
  }

  private async resolveArea(client: ServiceClient, townId: number, areaName: string) {
    const existingArea = await this.findAreaByName(client, townId, areaName);

    if (existingArea) {
      return existingArea;
    }

    const { data, error } = await client
      .from("areas")
      .insert({
        town_id: townId,
        name: areaName
      })
      .select("id,name,town_id")
      .single();

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to create the area.", error);
    }

    return data;
  }

  private async findTownByName(client: ServiceClient, countyId: number, townName: string) {
    const { data, error } = await client
      .from("towns")
      .select("id,name,county_id")
      .eq("county_id", countyId)
      .order("name", { ascending: true });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to search towns.", error);
    }

    return (data ?? []).find((town) => town.name.trim().toLowerCase() === townName.trim().toLowerCase()) ?? null;
  }

  private async findAreaByName(client: ServiceClient, townId: number, areaName: string) {
    const { data, error } = await client
      .from("areas")
      .select("id,name,town_id")
      .eq("town_id", townId)
      .order("name", { ascending: true });

    if (error) {
      throw new ServiceError(ServiceErrorCode.DATABASE_ERROR, "Unable to search areas.", error);
    }

    return (data ?? []).find((area) => area.name.trim().toLowerCase() === areaName.trim().toLowerCase()) ?? null;
  }

  private normalizePositiveInteger(value: number, label: string) {
    if (!Number.isFinite(value) || value < 1) {
      throw new ServiceError(ServiceErrorCode.VALIDATION_ERROR, `A valid ${label} is required.`);
    }

    return Math.trunc(value);
  }
}
