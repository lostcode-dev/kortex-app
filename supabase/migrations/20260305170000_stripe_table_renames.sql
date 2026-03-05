-- Rename billing tables to be explicitly Stripe-scoped
--
-- This migration is idempotent and safe to run on environments that already
-- use the new table names.

DO $$
BEGIN
  -- subscriptions -> stripe_subscriptions
  IF to_regclass('public.stripe_subscriptions') IS NULL
     AND to_regclass('public.subscriptions') IS NOT NULL THEN
    ALTER TABLE public.subscriptions RENAME TO stripe_subscriptions;
  END IF;

  -- invoices -> stripe_invoices
  IF to_regclass('public.stripe_invoices') IS NULL
     AND to_regclass('public.invoices') IS NOT NULL THEN
    ALTER TABLE public.invoices RENAME TO stripe_invoices;
  END IF;

  -- Index renames (best-effort)
  IF to_regclass('public.subscriptions_user_id_idx') IS NOT NULL
     AND to_regclass('public.stripe_subscriptions_user_id_idx') IS NULL THEN
    ALTER INDEX public.subscriptions_user_id_idx RENAME TO stripe_subscriptions_user_id_idx;
  END IF;

  IF to_regclass('public.subscriptions_status_idx') IS NOT NULL
     AND to_regclass('public.stripe_subscriptions_status_idx') IS NULL THEN
    ALTER INDEX public.subscriptions_status_idx RENAME TO stripe_subscriptions_status_idx;
  END IF;

  IF to_regclass('public.invoices_user_id_idx') IS NOT NULL
     AND to_regclass('public.stripe_invoices_user_id_idx') IS NULL THEN
    ALTER INDEX public.invoices_user_id_idx RENAME TO stripe_invoices_user_id_idx;
  END IF;

  IF to_regclass('public.invoices_customer_id_idx') IS NOT NULL
     AND to_regclass('public.stripe_invoices_customer_id_idx') IS NULL THEN
    ALTER INDEX public.invoices_customer_id_idx RENAME TO stripe_invoices_customer_id_idx;
  END IF;

  IF to_regclass('public.invoices_subscription_id_idx') IS NOT NULL
     AND to_regclass('public.stripe_invoices_subscription_id_idx') IS NULL THEN
    ALTER INDEX public.invoices_subscription_id_idx RENAME TO stripe_invoices_subscription_id_idx;
  END IF;

  IF to_regclass('public.invoices_status_idx') IS NOT NULL
     AND to_regclass('public.stripe_invoices_status_idx') IS NULL THEN
    ALTER INDEX public.invoices_status_idx RENAME TO stripe_invoices_status_idx;
  END IF;
END $$;
