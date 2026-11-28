export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          after: Json | null;
          at: string;
          before: Json | null;
          id: string;
          staff_user_id: string;
          target_id: string;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          id?: string;
          staff_user_id: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          action?: string;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          id?: string;
          staff_user_id?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_staff_user_id_fkey";
            columns: ["staff_user_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["user_id"];
          },
        ];
      };
      availability_rules: {
        Row: {
          coach_id: string | null;
          coach_type: Database["public"]["Enums"]["operator_type"] | null;
          court_id: string | null;
          end: string;
          id: string;
          owner_id: string;
          owner_type: Database["public"]["Enums"]["availability_owner_type"];
          start: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          coach_id?: never;
          coach_type?: never;
          court_id?: never;
          end: string;
          id?: string;
          owner_id: string;
          owner_type: Database["public"]["Enums"]["availability_owner_type"];
          start: string;
          weekday: number;
        };
        Update: {
          coach_id?: never;
          coach_type?: never;
          court_id?: never;
          end?: string;
          id?: string;
          owner_id?: string;
          owner_type?: Database["public"]["Enums"]["availability_owner_type"];
          start?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_coach_id_coach_type_fkey";
            columns: ["coach_id", "coach_type"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id", "type"];
          },
          {
            foreignKeyName: "availability_rules_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_items: {
        Row: {
          amount: number;
          booking_id: string;
          court_id: string | null;
          currency: string;
          ends_at: string | null;
          id: string;
          location_type: Database["public"]["Enums"]["booking_location_type"] | null;
          offering_id: string | null;
          operator_id: string;
          starts_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          booking_id: string;
          court_id?: string | null;
          currency?: string;
          ends_at?: string | null;
          id?: string;
          location_type?: Database["public"]["Enums"]["booking_location_type"] | null;
          offering_id?: string | null;
          operator_id: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
        };
        Update: {
          amount?: number;
          booking_id?: string;
          court_id?: string | null;
          currency?: string;
          ends_at?: string | null;
          id?: string;
          location_type?: Database["public"]["Enums"]["booking_location_type"] | null;
          offering_id?: string | null;
          operator_id?: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
        };
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_items_court_id_operator_id_fkey";
            columns: ["court_id", "operator_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id", "operator_id"];
          },
          {
            foreignKeyName: "booking_items_offering_id_operator_id_fkey";
            columns: ["offering_id", "operator_id"];
            isOneToOne: false;
            referencedRelation: "offerings";
            referencedColumns: ["id", "operator_id"];
          },
          {
            foreignKeyName: "booking_items_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          athlete_id: string;
          created_at: string;
          currency: string;
          id: string;
          status: Database["public"]["Enums"]["booking_status"];
          total: number;
        };
        ComputedFields: never;
        Insert: {
          athlete_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total: number;
        };
        Update: {
          athlete_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      branches: {
        Row: {
          address: string;
          hours: NonNullable<Json>;
          id: string;
          lat: number | null;
          lng: number | null;
          name: string;
          operator_id: string;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          hours?: NonNullable<Json>;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          operator_id: string;
          timezone?: string;
        };
        Update: {
          address?: string;
          hours?: NonNullable<Json>;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          operator_id?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_details: {
        Row: {
          certifications: NonNullable<Json>;
          experience_years: number;
          listed_branch_id: string | null;
          operator_id: string;
          operator_type: Database["public"]["Enums"]["operator_type"] | null;
        };
        ComputedFields: never;
        Insert: {
          certifications?: NonNullable<Json>;
          experience_years?: number;
          listed_branch_id?: string | null;
          operator_id: string;
          operator_type?: never;
        };
        Update: {
          certifications?: NonNullable<Json>;
          experience_years?: number;
          listed_branch_id?: string | null;
          operator_id?: string;
          operator_type?: never;
        };
        Relationships: [
          {
            foreignKeyName: "coach_details_listed_branch_id_fkey";
            columns: ["listed_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coach_details_operator_id_operator_type_fkey";
            columns: ["operator_id", "operator_type"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id", "type"];
          },
        ];
      };
      courts: {
        Row: {
          base_price: number;
          branch_id: string;
          currency: string;
          id: string;
          indoor: boolean;
          operator_id: string;
          sport: string;
          surface: string;
        };
        ComputedFields: never;
        Insert: {
          base_price: number;
          branch_id: string;
          currency?: string;
          id?: string;
          indoor?: boolean;
          operator_id: string;
          sport: string;
          surface: string;
        };
        Update: {
          base_price?: number;
          branch_id?: string;
          currency?: string;
          id?: string;
          indoor?: boolean;
          operator_id?: string;
          sport?: string;
          surface?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courts_branch_id_operator_id_fkey";
            columns: ["branch_id", "operator_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "operator_id"];
          },
        ];
      };
      departments: {
        Row: {
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      enquiries: {
        Row: {
          athlete_id: string;
          id: string;
          kind: Database["public"]["Enums"]["enquiry_kind"];
          offering_id: string | null;
          operator_id: string;
          status: Database["public"]["Enums"]["enquiry_status"];
        };
        ComputedFields: never;
        Insert: {
          athlete_id: string;
          id?: string;
          kind: Database["public"]["Enums"]["enquiry_kind"];
          offering_id?: string | null;
          operator_id: string;
          status?: Database["public"]["Enums"]["enquiry_status"];
        };
        Update: {
          athlete_id?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["enquiry_kind"];
          offering_id?: string | null;
          operator_id?: string;
          status?: Database["public"]["Enums"]["enquiry_status"];
        };
        Relationships: [
          {
            foreignKeyName: "enquiries_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "enquiries_offering_id_operator_id_fkey";
            columns: ["offering_id", "operator_id"];
            isOneToOne: false;
            referencedRelation: "offerings";
            referencedColumns: ["id", "operator_id"];
          },
          {
            foreignKeyName: "enquiries_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      media: {
        Row: {
          branch_id: string | null;
          court_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["media_kind"];
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          offering_id: string | null;
          operator_id: string | null;
          owner_id: string;
          owner_type: Database["public"]["Enums"]["media_owner_type"];
          sort: number;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          branch_id?: never;
          court_id?: never;
          id?: string;
          kind: Database["public"]["Enums"]["media_kind"];
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          offering_id?: never;
          operator_id?: never;
          owner_id: string;
          owner_type: Database["public"]["Enums"]["media_owner_type"];
          sort?: number;
          url: string;
        };
        Update: {
          branch_id?: never;
          court_id?: never;
          id?: string;
          kind?: Database["public"]["Enums"]["media_kind"];
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          offering_id?: never;
          operator_id?: never;
          owner_id?: string;
          owner_type?: Database["public"]["Enums"]["media_owner_type"];
          sort?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "offerings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          enquiry_id: string;
          id: string;
          sender_user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          enquiry_id: string;
          id?: string;
          sender_user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          enquiry_id?: string;
          id?: string;
          sender_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey";
            columns: ["sender_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      offerings: {
        Row: {
          active: boolean;
          age_group: string | null;
          capacity: number | null;
          currency: string;
          description: string;
          duration_min: number | null;
          id: string;
          kind: Database["public"]["Enums"]["offering_kind"];
          operator_id: string;
          price: number;
          sessions_count: number | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          age_group?: string | null;
          capacity?: number | null;
          currency?: string;
          description?: string;
          duration_min?: number | null;
          id?: string;
          kind: Database["public"]["Enums"]["offering_kind"];
          operator_id: string;
          price: number;
          sessions_count?: number | null;
          title: string;
        };
        Update: {
          active?: boolean;
          age_group?: string | null;
          capacity?: number | null;
          currency?: string;
          description?: string;
          duration_min?: number | null;
          id?: string;
          kind?: Database["public"]["Enums"]["offering_kind"];
          operator_id?: string;
          price?: number;
          sessions_count?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offerings_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      operator_applications: {
        Row: {
          id: string;
          operator_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          staff_message: string | null;
          status: Database["public"]["Enums"]["application_status"];
          submitted_data: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          operator_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_message?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_data?: NonNullable<Json>;
        };
        Update: {
          id?: string;
          operator_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          staff_message?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_data?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "operator_applications_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operator_applications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      operators: {
        Row: {
          area: string;
          bio: string;
          city: string;
          currency: string;
          display_name: string;
          id: string;
          owner_user_id: string;
          rating_avg: number;
          rating_count: number;
          slug: string;
          sports: string[];
          starting_price: number | null;
          status: Database["public"]["Enums"]["operator_status"];
          type: Database["public"]["Enums"]["operator_type"];
        };
        ComputedFields: never;
        Insert: {
          area: string;
          bio?: string;
          city: string;
          currency?: string;
          display_name: string;
          id?: string;
          owner_user_id: string;
          rating_avg?: number;
          rating_count?: number;
          slug: string;
          sports?: string[];
          starting_price?: number | null;
          status?: Database["public"]["Enums"]["operator_status"];
          type: Database["public"]["Enums"]["operator_type"];
        };
        Update: {
          area?: string;
          bio?: string;
          city?: string;
          currency?: string;
          display_name?: string;
          id?: string;
          owner_user_id?: string;
          rating_avg?: number;
          rating_count?: number;
          slug?: string;
          sports?: string[];
          starting_price?: number | null;
          status?: Database["public"]["Enums"]["operator_status"];
          type?: Database["public"]["Enums"]["operator_type"];
        };
        Relationships: [
          {
            foreignKeyName: "operators_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string;
          currency: string;
          id: string;
          provider: string;
          provider_ref: string;
          status: Database["public"]["Enums"]["payment_status"];
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          booking_id: string;
          currency?: string;
          id?: string;
          provider: string;
          provider_ref: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          booking_id?: string;
          currency?: string;
          id?: string;
          provider?: string;
          provider_ref?: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount: number;
          currency: string;
          id: string;
          operator_id: string;
          period: string;
          status: Database["public"]["Enums"]["payout_status"];
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          currency?: string;
          id?: string;
          operator_id: string;
          period: string;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Update: {
          amount?: number;
          currency?: string;
          id?: string;
          operator_id?: string;
          period?: string;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payouts_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          name: string;
        };
        ComputedFields: never;
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          phone: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          phone?: string | null;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          phone?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      refund_items: {
        Row: {
          amount: number;
          booking_id: string;
          booking_item_id: string;
          currency: string;
          id: string;
          refund_request_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          booking_id: string;
          booking_item_id: string;
          currency?: string;
          id?: string;
          refund_request_id: string;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          booking_item_id?: string;
          currency?: string;
          id?: string;
          refund_request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refund_items_booking_item_id_booking_id_fkey";
            columns: ["booking_item_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "booking_items";
            referencedColumns: ["id", "booking_id"];
          },
          {
            foreignKeyName: "refund_items_refund_request_id_booking_id_fkey";
            columns: ["refund_request_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "refund_requests";
            referencedColumns: ["id", "booking_id"];
          },
        ];
      };
      refund_requests: {
        Row: {
          booking_id: string;
          id: string;
          reason: string;
          requested_by: string;
          status: Database["public"]["Enums"]["refund_status"];
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          id?: string;
          reason: string;
          requested_by: string;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Update: {
          booking_id?: string;
          id?: string;
          reason?: string;
          requested_by?: string;
          status?: Database["public"]["Enums"]["refund_status"];
        };
        Relationships: [
          {
            foreignKeyName: "refund_requests_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_requests_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reason: string;
          reporter_id: string;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          reason: string;
          reporter_id: string;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: string;
        };
        Update: {
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      reviews: {
        Row: {
          athlete_id: string;
          body: string;
          booking_id: string;
          id: string;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          operator_id: string;
          rating: number;
        };
        ComputedFields: never;
        Insert: {
          athlete_id: string;
          body?: string;
          booking_id: string;
          id?: string;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          operator_id: string;
          rating: number;
        };
        Update: {
          athlete_id?: string;
          body?: string;
          booking_id?: string;
          id?: string;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          operator_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_athlete_id_fkey";
            columns: ["booking_id", "athlete_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id", "athlete_id"];
          },
          {
            foreignKeyName: "reviews_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_name: string;
          role_id: string;
        };
        ComputedFields: never;
        Insert: {
          permission_name: string;
          role_id: string;
        };
        Update: {
          permission_name?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_name_fkey";
            columns: ["permission_name"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      slot_blocks: {
        Row: {
          coach_id: string | null;
          coach_type: Database["public"]["Enums"]["operator_type"] | null;
          court_id: string | null;
          ends_at: string;
          id: string;
          reason: Database["public"]["Enums"]["slot_block_reason"];
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          coach_id?: string | null;
          coach_type?: never;
          court_id?: string | null;
          ends_at: string;
          id?: string;
          reason: Database["public"]["Enums"]["slot_block_reason"];
          starts_at: string;
        };
        Update: {
          coach_id?: string | null;
          coach_type?: never;
          court_id?: string | null;
          ends_at?: string;
          id?: string;
          reason?: Database["public"]["Enums"]["slot_block_reason"];
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slot_blocks_coach_id_coach_type_fkey";
            columns: ["coach_id", "coach_type"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id", "type"];
          },
          {
            foreignKeyName: "slot_blocks_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          department_id: string;
          mfa_required: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          department_id: string;
          mfa_required?: boolean;
          user_id: string;
        };
        Update: {
          active?: boolean;
          department_id?: string;
          mfa_required?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      staff_roles: {
        Row: {
          role_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          role_id: string;
          user_id: string;
        };
        Update: {
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["user_id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_staff_id: string | null;
          id: string;
          opened_by: string;
          role: Database["public"]["Enums"]["ticket_role"];
          status: Database["public"]["Enums"]["ticket_status"];
          subject: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_staff_id?: string | null;
          id?: string;
          opened_by: string;
          role: Database["public"]["Enums"]["ticket_role"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject: string;
        };
        Update: {
          assigned_staff_id?: string | null;
          id?: string;
          opened_by?: string;
          role?: Database["public"]["Enums"]["ticket_role"];
          status?: Database["public"]["Enums"]["ticket_status"];
          subject?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "support_tickets_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_permission: { Args: { permission: string }; Returns: boolean };
    };
    Enums: {
      application_status: "draft" | "pending" | "changes_requested" | "rejected" | "approved";
      availability_owner_type: "court" | "coach";
      booking_location_type: "listed_venue" | "own_location" | "booked_court";
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "refunded"
        | "partially_refunded";
      enquiry_kind: "question" | "free_visit" | "trial";
      enquiry_status: "waiting" | "replied" | "booked" | "closed";
      media_kind: "photo" | "video";
      media_owner_type: "operator" | "branch" | "court" | "portfolio" | "offering";
      moderation_status: "pending" | "approved" | "rejected";
      offering_kind: "session" | "bundle" | "membership_plan" | "program" | "trial" | "free_visit";
      operator_status:
        "draft" | "pending" | "changes_requested" | "rejected" | "approved" | "live" | "paused";
      operator_type: "coach" | "court_owner" | "gym" | "academy";
      payment_status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
      payout_status: "pending" | "paid" | "failed";
      refund_status: "requested" | "approved" | "rejected" | "paid";
      report_status: "open" | "resolved" | "dismissed";
      slot_block_reason: "walk_in" | "booking_hold" | "closed";
      ticket_role: "athlete" | "operator";
      ticket_status: "open" | "in_progress" | "closed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      application_status: ["draft", "pending", "changes_requested", "rejected", "approved"],
      availability_owner_type: ["court", "coach"],
      booking_location_type: ["listed_venue", "own_location", "booked_court"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
        "partially_refunded",
      ],
      enquiry_kind: ["question", "free_visit", "trial"],
      enquiry_status: ["waiting", "replied", "booked", "closed"],
      media_kind: ["photo", "video"],
      media_owner_type: ["operator", "branch", "court", "portfolio", "offering"],
      moderation_status: ["pending", "approved", "rejected"],
      offering_kind: ["session", "bundle", "membership_plan", "program", "trial", "free_visit"],
      operator_status: [
        "draft",
        "pending",
        "changes_requested",
        "rejected",
        "approved",
        "live",
        "paused",
      ],
      operator_type: ["coach", "court_owner", "gym", "academy"],
      payment_status: ["pending", "succeeded", "failed", "refunded", "partially_refunded"],
      payout_status: ["pending", "paid", "failed"],
      refund_status: ["requested", "approved", "rejected", "paid"],
      report_status: ["open", "resolved", "dismissed"],
      slot_block_reason: ["walk_in", "booking_hold", "closed"],
      ticket_role: ["athlete", "operator"],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const;
