@echo off
echo Deploiement de toutes les edge functions mises a jour...
echo.

npx supabase functions deploy stripe-create-appointment-payment --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy stripe-create-connect-account --no-verify-jwt
npx supabase functions deploy stripe-check-connect-status --no-verify-jwt
npx supabase functions deploy stripe-create-subscription-checkout --no-verify-jwt
npx supabase functions deploy validate-appointment --no-verify-jwt
npx supabase functions deploy cancel-expired-appointments --no-verify-jwt
npx supabase functions deploy process-payouts --no-verify-jwt
npx supabase functions deploy send-reminders --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy send-contact-email --no-verify-jwt
npx supabase functions deploy send-consultation-request --no-verify-jwt

echo.
echo Deploiement termine !
