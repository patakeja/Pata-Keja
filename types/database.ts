import type { UserRole } from "./auth";
import type { BookingStatus } from "./booking";
import type { RentalSource } from "./landlord";
import type { HouseType, ListingType } from "./listing";
import type { PaymentMethod, PaymentStatus, PaymentType } from "./payment";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type PersistedUserRole = Exclude<UserRole, UserRole.GUEST>;
type PersistedBookingStatus = BookingStatus;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: PersistedUserRole;
          commission_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: PersistedUserRole;
          commission_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: PersistedUserRole;
          commission_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      counties: {
        Row: {
          id: number;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      towns: {
        Row: {
          id: number;
          county_id: number;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          county_id: number;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          county_id?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "towns_county_id_fkey";
            columns: ["county_id"];
            isOneToOne: false;
            referencedRelation: "counties";
            referencedColumns: ["id"];
          }
        ];
      };
      areas: {
        Row: {
          id: number;
          town_id: number;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          town_id: number;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          town_id?: number;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "areas_town_id_fkey";
            columns: ["town_id"];
            isOneToOne: false;
            referencedRelation: "towns";
            referencedColumns: ["id"];
          }
        ];
      };
      listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          listing_type: ListingType;
          house_type: HouseType;
          landlord_id: string;
          county_id: number;
          town_id: number;
          area_id: number;
          total_units: number;
          available_units: number;
          max_active_bookings: number;
          deposit_amount: number;
          hold_duration_hours: number;
          available_from: string | null;
          latitude: number | null;
          longitude: number | null;
          maps_link: string | null;
          image_paths: string[];
          cover_image: string | null;
          last_image_update_at: string | null;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          price: number;
          listing_type: ListingType;
          house_type: HouseType;
          landlord_id: string;
          county_id: number;
          town_id: number;
          area_id: number;
          total_units?: number;
          available_units?: number;
          max_active_bookings?: number;
          deposit_amount?: number;
          hold_duration_hours?: number;
          available_from?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          maps_link?: string | null;
          image_paths?: string[];
          cover_image?: string | null;
          last_image_update_at?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          listing_type?: ListingType;
          house_type?: HouseType;
          landlord_id?: string;
          county_id?: number;
          town_id?: number;
          area_id?: number;
          total_units?: number;
          available_units?: number;
          max_active_bookings?: number;
          deposit_amount?: number;
          hold_duration_hours?: number;
          available_from?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          maps_link?: string | null;
          image_paths?: string[];
          cover_image?: string | null;
          last_image_update_at?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_county_id_fkey";
            columns: ["county_id"];
            isOneToOne: false;
            referencedRelation: "counties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_town_id_fkey";
            columns: ["town_id"];
            isOneToOne: false;
            referencedRelation: "towns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          }
        ];
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          status: PersistedBookingStatus;
          deposit_amount: number;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          status?: PersistedBookingStatus;
          deposit_amount?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          status?: PersistedBookingStatus;
          deposit_amount?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          amount: number;
          payment_type: PaymentType;
          method: PaymentMethod;
          status: PaymentStatus;
          commission_amount: number;
          refund_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          amount: number;
          payment_type: PaymentType;
          method: PaymentMethod;
          status?: PaymentStatus;
          commission_amount?: number;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          amount?: number;
          payment_type?: PaymentType;
          method?: PaymentMethod;
          status?: PaymentStatus;
          commission_amount?: number;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      finance_settings: {
        Row: {
          id: number;
          refund_percentage: number;
          booking_capacity_multiplier: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          refund_percentage?: number;
          booking_capacity_multiplier?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          refund_percentage?: number;
          booking_capacity_multiplier?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      rental_events: {
        Row: {
          id: string;
          listing_id: string;
          landlord_id: string;
          booking_id: string | null;
          source: RentalSource;
          notes: string | null;
          admin_review_required: boolean;
          admin_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          landlord_id: string;
          booking_id?: string | null;
          source: RentalSource;
          notes?: string | null;
          admin_review_required?: boolean;
          admin_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          landlord_id?: string;
          booking_id?: string | null;
          source?: RentalSource;
          notes?: string | null;
          admin_review_required?: boolean;
          admin_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rental_events_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rental_events_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rental_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
