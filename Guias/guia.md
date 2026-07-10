nvm use 22
cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-\server"
copy .env.example .env

# Ajustar en .env: PORT (API), FRONTEND_PORT, CORS_ORIGIN

npm install
npm run dev

# Otra terminal — frontend (desde la raíz del proyecto)

cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-"
npx --yes serve -p 8080

# Terminal 3 — worker auto-envío (opcional)
cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-\server"
npm run worker

# Producción como servicio Windows (NSSM): ver Guias/nssm-servicios.md
# Worker automático: ver Guias/worker-auto-envio.md
