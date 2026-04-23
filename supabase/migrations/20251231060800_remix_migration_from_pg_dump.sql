CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_csv text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary jsonb,
    allocation jsonb,
    session_id text NOT NULL
);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: portfolios update_portfolios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolios Users can delete own portfolio data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own portfolio data" ON public.portfolios FOR DELETE USING ((session_id = (auth.uid())::text));


--
-- Name: portfolios Users can insert own portfolio data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own portfolio data" ON public.portfolios FOR INSERT WITH CHECK ((session_id = (auth.uid())::text));


--
-- Name: portfolios Users can read own portfolio data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own portfolio data" ON public.portfolios FOR SELECT USING ((session_id = (auth.uid())::text));


--
-- Name: portfolios Users can update own portfolio data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own portfolio data" ON public.portfolios FOR UPDATE USING ((session_id = (auth.uid())::text)) WITH CHECK ((session_id = (auth.uid())::text));


--
-- Name: portfolios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;