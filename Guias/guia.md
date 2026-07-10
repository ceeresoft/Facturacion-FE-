nvm use 22
cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-\server"
copy .env.example .env

# Ajustar en .env: PORT (API), FRONTEND_PORT, CORS_ORIGIN

npm install
npm run dev

# Otra terminal — frontend (desde la raíz del proyecto)

cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-"
npx --yes serve -p 8080

# Producción como servicio Windows (NSSM): ver Guias/nssm-servicios.md
