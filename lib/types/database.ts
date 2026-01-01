export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          details: Record<string, any>
          ip_address: string | null
          user_agent: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Record<string, any>
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      security_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity: 'low' | 'medium' | 'high' | 'critical'
          description: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Record<string, any>
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, any>
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, any>
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          role: 'dealer' | 'renter'
          full_name: string | null
          phone: string | null
          address: string | null
          verification_status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'dealer' | 'renter'
          full_name?: string | null
          phone?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'dealer' | 'renter'
          full_name?: string | null
          phone?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          dealer_id: string
          make: string
          model: string
          year: number
          price_per_day: number
          location: string
          description: string | null
          mileage_limit: number | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dealer_id: string
          make: string
          model: string
          year: number
          price_per_day: number
          location: string
          description?: string | null
          mileage_limit?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dealer_id?: string
          make?: string
          model?: string
          year?: number
          price_per_day?: number
          location?: string
          description?: string | null
          mileage_limit?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          renter_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          renter_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status?: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          renter_id?: string
          vehicle_id?: string
          start_date?: string
          end_date?: string
          total_price?: number
          status?: 'draft' | 'pending_payment' | 'confirmed' | 'canceled'
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}