-- ==============================================================================
-- Webhook Trigger for Push Notifications
-- ==============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_activity_created ON public.activities;
DROP FUNCTION IF EXISTS public.trigger_push_notification();

-- Note: We assume the edge function is deployed to the Supabase project
-- In local development, you might use pg_net directly, but for Supabase
-- cloud, it's easier to create a trigger that calls the HTTP endpoint.
-- We will use the pg_net extension to make HTTP requests.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
    endpoint_url TEXT := current_setting('app.settings.edge_function_url', true) || '/send-push-notification';
    service_role_key TEXT := current_setting('app.settings.service_role_key', true);
    request_id BIGINT;
BEGIN
    -- Only attempt to call if the variables are set (they would be set in Supabase via Dashboard or ENV)
    IF endpoint_url IS NOT NULL AND service_role_key IS NOT NULL THEN
        SELECT net.http_post(
            url := endpoint_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := jsonb_build_object(
                'type', 'INSERT',
                'table', 'activities',
                'record', row_to_json(NEW)
            )
        ) INTO request_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_activity_created
    AFTER INSERT ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.trigger_push_notification();
