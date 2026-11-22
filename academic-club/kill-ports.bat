@echo off
echo Stopping anything listening on ports 5000 (API) and 4200 (website)...
for %%P in (5000 4200) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    echo Stopping PID %%A on port %%P
    taskkill /PID %%A /F >nul 2>&1
  )
)
echo Done. Now run: npm run dev
