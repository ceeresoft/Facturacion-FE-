nvm use 22
cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-\server"
copy .env.example .env
# Ajustar en .env: PORT (API), FRONTEND_PORT, CORS_ORIGIN
npm install
npm run dev

# Otra terminal — frontend (lee FRONTEND_PORT del .env)
cd "C:\Temporal\jonathan biutiful\PROYECTO FACTURACION\Facturacion-FE-\server"
npm run frontend