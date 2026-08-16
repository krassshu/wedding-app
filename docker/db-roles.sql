-- The Supabase base image creates these roles without passwords. Keep their
-- credentials aligned with the password used by PostgREST and Storage.
alter role authenticator with login password :'role_password';
alter role supabase_storage_admin with login password :'role_password';
