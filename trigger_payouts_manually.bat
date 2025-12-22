@echo off
REM Script pour déclencher manuellement la fonction process-payouts
REM Utilisez ce script pour tester ou forcer l'exécution

echo ========================================
echo Déclenchement de process-payouts
echo ========================================
echo.

REM Remplacez VOTRE_SERVICE_ROLE_KEY par votre vraie clé de service
REM Vous pouvez la trouver dans Settings > API de votre projet Supabase
set SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY

echo Appel de la fonction process-payouts...
echo.

curl -X POST ^
  https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts ^
  -H "Authorization: Bearer %SERVICE_ROLE_KEY%" ^
  -H "Content-Type: application/json" ^
  -v

echo.
echo ========================================
echo Terminé!
echo ========================================
echo.
echo Consultez les logs dans le Dashboard Supabase:
echo https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/functions/process-payouts/logs
echo.
pause
