# Conectar el panel privado de Final Touch

La página de clientes es `https://ezeherran06.github.io/final-touch/`. Tu panel privado es `https://ezeherran06.github.io/final-touch/admin.html`. Tus clientes no necesitan registrarse.

## 1. Crear las tablas privadas

1. Entrá a tu proyecto en [Supabase](https://supabase.com/dashboard).
2. En el menú lateral, abrí **SQL Editor** y elegí **New query**.
3. Abrí el archivo `supabase-setup.sql` de este repositorio en GitHub: <https://github.com/ezeherran06/final-touch/blob/main/supabase-setup.sql>. Copiá su contenido y pegalo en la consulta nueva.
4. En el texto pegado, buscá las dos apariciones de `REEMPLAZAR_POR_TU_CORREO` y reemplazalas por el correo que usarás para ingresar al panel.
5. Presioná **Run**. No compartas claves secretas ni hace falta pegarlas en el SQL.

## 2. Permitir el enlace de ingreso

En Supabase, abrí **Authentication → Users → Add user**. Creá un usuario con el correo autorizado en `supabase-setup.sql`, elegí una contraseña segura y activá **Auto Confirm User** si aparece esa opción. Guardá la contraseña únicamente en un lugar privado; no la compartas por el chat. Después, ingresá en `https://ezeherran06.github.io/final-touch/admin.html` con ese correo y contraseña.

El panel usa acceso por contraseña y no necesita enviar correos, SMTP ni que agregues integrantes al equipo de Supabase.

## Datos y seguridad

La página pública recibe solo precios, horarios, número de WhatsApp, horarios ocupados y días bloqueados. Los nombres, teléfonos, direcciones, clientes y agenda completa se guardan en una tabla privada protegida por políticas de acceso. La configuración pública del sitio usa solamente la clave publishable; nunca incluyas una clave `sb_secret_` o `service_role` en el sitio.
