-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointment_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointment_comments_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_comments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT appointment_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.appointment_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  appointment_id uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text NOT NULL CHECK (file_type = ANY (ARRAY['pdf'::text, 'mp3'::text, 'mp4'::text])),
  uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  uploaded_by uuid,
  description text,
  visible_to_client boolean DEFAULT true,
  visible_to_consultant boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT appointment_documents_pkey PRIMARY KEY (id),
  CONSTRAINT appointment_documents_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT appointment_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id),
  CONSTRAINT appointment_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT appointment_documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  practitioner_id uuid,
  service_id uuid,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'confirmed'::character varying::text, 'cancelled'::character varying::text, 'completed'::character varying::text])),
  payment_status character varying DEFAULT 'unpaid'::character varying CHECK (payment_status::text = ANY (ARRAY['unpaid'::character varying::text, 'paid'::character varying::text, 'refunded'::character varying::text])),
  payment_id character varying,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  beneficiary_first_name character varying,
  beneficiary_last_name character varying,
  beneficiary_birth_date date,
  created_by uuid,
  updated_by uuid,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  review text,
  meeting_link text,
  custom_price numeric,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id),
  CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT appointments_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id),
  CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT appointments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.availability (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  practitioner_id uuid,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  CONSTRAINT availability_pkey PRIMARY KEY (id),
  CONSTRAINT availability_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  response text,
  responded_at timestamp with time zone,
  assigned_to_email text,
  assigned_to_name text,
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.login_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  login_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ip_address character varying,
  user_agent text,
  country character varying,
  city character varying,
  region character varying,
  latitude numeric,
  longitude numeric,
  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.practitioner_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  practitioner_id uuid,
  service_id uuid,
  CONSTRAINT practitioner_skills_pkey PRIMARY KEY (id),
  CONSTRAINT practitioner_skills_practitioner_id_fkey FOREIGN KEY (practitioner_id) REFERENCES public.practitioners(id),
  CONSTRAINT practitioner_skills_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.practitioners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  bio text,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  display_name text,
  title text,
  summary text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT practitioners_pkey PRIMARY KEY (id),
  CONSTRAINT practitioners_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT practitioners_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id),
  CONSTRAINT practitioners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name character varying,
  last_name character varying,
  phone character varying,
  user_type character varying CHECK (user_type::text = ANY (ARRAY['admin'::character varying::text, 'intervenant'::character varying::text, 'client'::character varying::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  email character varying,
  birth_date date,
  created_by uuid,
  updated_by uuid,
  is_active boolean DEFAULT true,
  pseudo character varying,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  category character varying NOT NULL,
  subcategory character varying NOT NULL,
  price numeric NOT NULL,
  duration integer NOT NULL,
  description text,
  is_on_demand boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid,
  caracteristiques jsonb,
  objectifs jsonb,
  methodes jsonb,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT services_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  setting_key character varying NOT NULL UNIQUE,
  setting_value text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);