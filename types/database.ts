import type { UserRole } from "./auth";
import type { BookingStatus } from "./booking";
import type { MessageStatus } from "./chat";
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
          county_id: number | null;
          town_id: number | null;
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
          county_id?: number | null;
          town_id?: number | null;
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
          county_id?: number | null;
          town_id?: number | null;
          role?: PersistedUserRole;
          commission_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_county_id_fkey";
            columns: ["county_id"];
            isOneToOne: false;
            referencedRelation: "counties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_county_town_consistency_fk";
            columns: ["county_id", "town_id"];
            isOneToOne: false;
            referencedRelation: "towns";
            referencedColumns: ["county_id", "id"];
          }
        ];
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
      conversations: {
        Row: {
          id: string;
          listing_id: string;
          booking_id: string;
          tenant_id: string;
          landlord_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          booking_id: string;
          tenant_id: string;
          landlord_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          booking_id?: string;
          tenant_id?: string;
          landlord_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          created_at: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          created_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          created_at?: string;
          last_read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          original_content: string;
          status: MessageStatus;
          client_message_id: string | null;
          is_deleted_by_sender: boolean;
          is_deleted_by_receiver: boolean;
          deleted_by_user_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          original_content?: string;
          status?: MessageStatus;
          client_message_id?: string | null;
          is_deleted_by_sender?: boolean;
          is_deleted_by_receiver?: boolean;
          deleted_by_user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          original_content?: string;
          status?: MessageStatus;
          client_message_id?: string | null;
          is_deleted_by_sender?: boolean;
          is_deleted_by_receiver?: boolean;
          deleted_by_user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_deleted_by_user_id_fkey";
            columns: ["deleted_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      message_reads: {
        Row: {
          id: string;
          message_id: string;
          read_by_user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          read_by_user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          read_by_user_id?: string;
          read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_reads_read_by_user_id_fkey";
            columns: ["read_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_presence: {
        Row: {
          user_id: string;
          is_online: boolean;
          last_seen: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          is_online?: boolean;
          last_seen?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          is_online?: boolean;
          last_seen?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
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
