# 🚀 Guía de instalación — AcademiaCRM

## Para personas sin experiencia técnica

\---

## ¿Qué vamos a hacer?

En 4 pasos vas a tener la app funcionando en internet,
accesible desde cualquier computadora o celular:

1. Crear la base de datos en Supabase (gratis)
2. Desplegar la app en Vercel (gratis)
3. Conectar ambas
4. Cargar tu base de alumnos

**Tiempo estimado: 20–30 minutos**

\---

## PASO 1 — Crear cuenta en Supabase

Supabase es donde se guardarán todos los datos.
Es gratuito para proyectos pequeños y medianos.

1. Ve a **https://supabase.com**
2. Haz clic en **"Start for free"**
3. Crea una cuenta con Google o email
4. Haz clic en **"New project"**
5. Completa:

   * **Organization**: el nombre de tu escuela
   * **Project name**: `academia-crm`
   * **Database Password**: elige una contraseña segura (guárdala)
   * **Region**: elige la más cercana a tu país
6. Haz clic en **"Create new project"**
7. Espera \~2 minutos mientras crea el proyecto

\---

## PASO 2 — Crear las tablas de la base de datos

1. En tu proyecto de Supabase, busca en el menú izquierdo: **SQL Editor**
2. Haz clic en **"New query"**
3. Abre el archivo `supabase-schema.sql` que está en la carpeta del proyecto
4. Selecciona TODO el contenido (Ctrl+A) y cópialo
5. Pégalo en el SQL Editor de Supabase
6. **IMPORTANTE**: Antes de ejecutar, busca estas líneas y cambia los nombres:

```
   ('Asesora 1'),   -- Cambia por el nombre real de tu asesora
   ('Asesora 2'),   -- Cambia por el nombre real de tu asesora
   ('Orientador')   -- Cambia por el nombre real
   ```

7. Haz clic en **"Run"** (botón verde)
8. Deberías ver al final una tabla con 3 filas mostrando las tablas creadas

\---

## PASO 3 — Obtener tus credenciales de Supabase

1. En Supabase, ve a **Settings** (ícono de engranaje, menú izquierdo)
2. Haz clic en **"API"**
3. Copia y guarda estos dos valores:

   * **Project URL** → se ve así: `https://abcdefghij.supabase.co`
   * **anon public** (debajo de "Project API keys") → es una cadena larga

\---

## PASO 4 — Desplegar la app en Vercel

Vercel publica la app en internet gratis.

### 4a. Subir el código a GitHub

1. Ve a **https://github.com** y crea una cuenta si no tienes
2. Haz clic en **"New repository"**
3. Nombre: `academia-crm`
4. Haz clic en **"Create repository"**
5. Descarga e instala **GitHub Desktop**: https://desktop.github.com
6. En GitHub Desktop: File → Add Local Repository → selecciona la carpeta del proyecto
7. Haz clic en **"Publish repository"**

### 4b. Desplegar en Vercel

1. Ve a **https://vercel.com** y crea cuenta con GitHub
2. Haz clic en **"Add New Project"**
3. Importa el repositorio `academia-crm`
4. Vercel detectará automáticamente que es Vite/React
5. Antes de hacer Deploy, haz clic en **"Environment Variables"**
6. Agrega estas dos variables:

|Nombre|Valor|
|-|-|
|`VITE\_SUPABASE\_URL`|tu Project URL de Supabase|
|`VITE\_SUPABASE\_ANON\_KEY`|tu anon key de Supabase|

7. Haz clic en **"Deploy"**
8. Espera \~2 minutos
9. Vercel te dará una URL como: `https://academia-crm-xxx.vercel.app`

**¡Esa URL es tu aplicación! Compártela con tus asesoras.**

\---

## PASO 5 — Primera configuración

1. Abre la URL de tu app
2. Ve a la página **"Setup"** (`/setup`)
3. Haz clic en **"Probar conexión"**

   * Si dice ✓ verde: ¡todo listo!
   * Si hay error: verifica las variables de entorno en Vercel

\---

## PASO 6 — Cargar la base de alumnos

### Formato del archivo CSV

Crea un archivo Excel con estas columnas exactas:

|Nombre completo|Programa|Semana actual|Asesora|Estado|
|-|-|-|-|-|
|Juan Pérez|Trading Avanzado|5|María García|Activo|
|Ana Flores|Forex Básico|3|Ana López|Activo|

### Cómo importar

1. Guarda el Excel como **CSV** (Archivo → Guardar como → CSV UTF-8)
2. En la app, ve a **"Importar"**
3. Selecciona **"Base de alumnos"**
4. Arrastra o selecciona tu archivo CSV
5. Revisa la vista previa
6. Haz clic en **"Importar"**

\---

## PASO 7 — Empezar a usar

1. Ve a **"Seguimiento"**
2. Selecciona programa → alumno → llena el formulario
3. Los registros se guardan automáticamente en Supabase
4. Todas las asesoras ven los datos en tiempo real

\---

## Actualizar la base de alumnos

Cuando tengas nuevos alumnos o cambios de semana:

1. Ve a **Importar → Base de alumnos**
2. Carga el nuevo archivo
3. Los alumnos existentes se actualizan, los nuevos se agregan

\---

## Preguntas frecuentes

**¿Las asesoras necesitan instalar algo?**
No. Solo abren la URL en el navegador.

**¿Se pierden los datos si cierro la app?**
No. Todo está en Supabase, en la nube.

**¿Las asesoras pueden ver los registros de las demás?**
Sí, es un sistema compartido. Pueden filtrar por asesora en el panel derecho.

**¿Tiene costo?**
Supabase: gratis hasta 500 MB de datos y 50,000 filas.
Vercel: gratis para proyectos personales/pequeños.
Para tu escuela de trading, deberías estar dentro del límite gratuito por meses o años.

**¿Qué pasa cuando lleguemos al límite gratuito?**
Supabase Pro cuesta $25/mes. Vercel Pro $20/mes.
Con ese tamaño de operación ya tienes datos muy valiosos.

\---

## Próximas fases

|Fase|Módulo|Estado|
|-|-|-|
|1|Seguimiento de llamadas|✅ Listo|
|2|Recaudación|🔜 Próximamente|
|3|Orientación técnica|🔜 Próximamente|
|4|Dashboard ejecutivo|🔜 Próximamente|

\---

*¿Tienes problemas? Comparte el mensaje de error exacto para resolverlo.

v1.2*

