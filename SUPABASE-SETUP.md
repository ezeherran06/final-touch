# Configuración del panel privado

El sitio público muestra servicios y turnos. La agenda, los clientes y los ajustes se guardan en Supabase y solo son accesibles desde el panel con el correo autorizado.

1. Creá un proyecto gratuito en [Supabase](https://supabase.com/dashboard).
2. En **SQL Editor**, abrí `supabase-setup.sql`. Reemplazá las dos apariciones de `REEMPLAZAR_POR_TU_CORREO` por el correo que vas a usar para ingresar al panel y ejecutá el SQL.
3. En **Authentication → URL Configuration → Redirect URLs**, agregá `https://ezeherran06.github.io/final-touch/admin.html`.
4. En **Project Settings → API**, copiá el **Project URL** y la clave pública **anon** o **publishable**. No compartas la clave `service_role` ni ninguna clave marcada como secreta.
5. Pasame el Project URL y la clave pública para conectarlos al sitio. Después vas a poder administrar todo desde `https://ezeherran06.github.io/final-touch/admin.html`.

La tabla pública contiene solo precios, horarios, WhatsApp y horarios ocupados. Los nombres, teléfonos, direcciones y demás datos de clientes permanecen en una tabla privada protegida por políticas de acceso.
