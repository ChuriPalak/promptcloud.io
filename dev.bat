@echo off
cd /d "%~dp0"
set NODE_OPTIONS=--no-warnings
"%~dp0node_modules\.bin\next.cmd" dev --webpack
