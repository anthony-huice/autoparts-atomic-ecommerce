// =============================================================================
// types/database.ts
// Tipos TypeScript que reflejan el esquema PostgreSQL de la base de datos.
// NOTA: Este archivo debe mantenerse sincronizado con los scripts SQL en
//       database/. Idealmente se regenera con `supabase gen types typescript`.
//       Se define manualmente para bootstrap del proyecto.
// Última sincronización: Migr. 033_rpc_vistas_y_estado.sql (v0.6.0)
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (reflejo de los tipos ENUM de PostgreSQL — 001_create_enums.sql)
// ---------------------------------------------------------------------------

export type TipoEmpresa = 'ALIADO_COMERCIAL' | 'CONCESIONARIO';

/**
 * Estado del ciclo de vida de una publicación (032_estado_publicacion.sql).
 * ACTIVO:  Visible en el catálogo público.
 * PAUSADO: Oculto temporalmente por el vendedor (no aparece en catálogo).
 * VENDIDO: Muestra el Ribbon visual por 7 días, luego se oculta del catálogo.
 */
export type EstadoPublicacion = 'ACTIVO' | 'PAUSADO' | 'VENDIDO';

export type EstadoVerificacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export type VendedorTipo = 'PARTICULAR' | 'EMPRESA';

export type Transmision = 'AUTOMATICO' | 'SINCRONICO' | 'DUAL';

export type Combustible = 'DIESEL' | 'GASOLINA' | 'GAS' | 'ELECTRICO';

export type Nacionalidad = 'V' | 'E' | 'P';

/** Categoría / tipo de carrocería del vehículo */
export type TipoVehiculo = 'CARGA' | 'SEDAN' | 'SUV' | 'MINIVAN' | 'PICKUP' | 'MOTO';

/**
 * Plan de publicación del vehículo (024_planes_publicacion.sql).
 * BASICO:    gratuito, 15 días, máx 4 fotos, renovable a $1 USD + IVA.
 * DESTACADO: $5 USD + IVA, 45 días, máx 10 fotos, posición prioritaria.
 */
export type TipoPlan = 'BASICO' | 'DESTACADO';

// ---------------------------------------------------------------------------
// Tipos JSONB estructurados
// ---------------------------------------------------------------------------

/** Estructura del campo `ubicacion` en vehiculos, repuestos y empresas */
export interface Ubicacion {
  estado: string;
  ciudad: string;
  lat?: number;
  lng?: number;
}

/**
 * Estructura del campo `documentos_legales` en empresas.
 * Agrupa todos los campos del formulario "ALIADO INFORMACION EMPRESA".
 */
export interface DocumentosLegales {
  nombre_registro?: string;    // "NOMBRE DEL REGISTRO" en el formulario
  circunscripcion?: string;    // "CIRCUNSCRIPCION JUDICIAL"
  tomo?: string;               // "NRO DE TOMO"
  folio?: string;              // "NRO DE FOLIO"
  nro_expediente?: string;     // "NRO DE EXPEDIENTE"
  fecha_registro?: string;     // "FECHA DE REGISTRO" — ISO 8601 date string
  rif_url?: string;            // URL del documento RIF en Storage
  urls?: string[];             // URLs de registro mercantil u otros documentos
}

// ---------------------------------------------------------------------------
// Tabla: personas (002_create_personas.sql)
// Unifica: Representante Legal, Empleado, Anunciante, Propietario, Vendedor.
// El ROL de cada persona se determina por las FK en otras tablas.
// ---------------------------------------------------------------------------

export interface Persona {
  id: string;                      // UUID
  /**
   * FK a auth.users(id) de Supabase.
   * Permite escribir políticas RLS que navegan:
   *   vehiculos.propietario_id → personas.auth_user_id = auth.uid()
   * Una persona puede existir sin cuenta (auth_user_id = null)
   * ej. propietario registrado por un empleado antes de que se registre.
   */
  auth_user_id: string | null;
  nombres: string;
  apellidos: string;
  nacionalidad: Nacionalidad;
  cedula_pasaporte: string;
  fecha_nacimiento: string | null; // DATE → string ISO 'YYYY-MM-DD'
  direccion_residencia: string | null;
  telefonos: string[];
  correo: string;
  redes_sociales: string[];        // URLs de redes sociales / Instagram / TikTok
  foto_cedula_url: string | null;  // URL en Supabase Storage (bucket privado)
  is_superadmin: boolean;          // Flag de superadmin para panel de control
  estado_verificacion: EstadoVerificacion | null; // KYC de persona (null = sin iniciar)
  created_at: string;              // TIMESTAMPTZ → string ISO 8601
  deleted_at: string | null;       // NULL = activo (Soft Delete)
}

export type PersonaInsert = Omit<Persona, 'id' | 'created_at' | 'deleted_at'> & {
  fecha_nacimiento?: string | null;
  direccion_residencia?: string | null;
  redes_sociales?: string[];
  foto_cedula_url?: string | null;
};

export type PersonaUpdate = Partial<PersonaInsert>;

// ---------------------------------------------------------------------------
// Tabla: empresas (003_create_empresas.sql)
// Unifica: ALIADO_COMERCIAL y CONCESIONARIO.
// ---------------------------------------------------------------------------

export interface Empresa {
  id: string;
  tipo_empresa: TipoEmpresa;
  razon_social: string;
  nombre_comercial: string | null;    // "NOMBRE ESTABLECIMIENTO"
  rif: string;
  direccion: string | null;           // Dirección fiscal
  telefonos: string[];
  correo: string | null;
  pagina_web: string | null;          // "PAGINA WEB O REDES"
  foto_establecimiento_url: string | null;
  ubicacion: Ubicacion;               // Geolocalización del establecimiento
  documentos_legales: DocumentosLegales;
  estado_verificacion: EstadoVerificacion;
  created_at: string;
  deleted_at: string | null;
}

export type EmpresaInsert = Omit<Empresa, 'id' | 'created_at' | 'deleted_at'> & {
  nombre_comercial?: string | null;
  direccion?: string | null;
  correo?: string | null;
  pagina_web?: string | null;
  foto_establecimiento_url?: string | null;
  ubicacion?: Ubicacion;
  documentos_legales?: DocumentosLegales;
};

export type EmpresaUpdate = Partial<EmpresaInsert>;

// ---------------------------------------------------------------------------
// Tabla: empleados_empresa (003_create_empresas.sql — tabla puente)
// ---------------------------------------------------------------------------

export interface EmpleadoEmpresa {
  id: string;
  empresa_id: string;
  persona_id: string;
  cargo: string;                    // "CARGO EN LA EMPRESA"
  es_representante_legal: boolean;  // TRUE = Representante Legal, FALSE = Empleado
}

export type EmpleadoEmpresaInsert = Omit<EmpleadoEmpresa, 'id'>;

// ---------------------------------------------------------------------------
// Tabla: vehiculos (004_create_vehiculos.sql)
// ---------------------------------------------------------------------------

/**
 * Vehículo cuyo vendedor es una persona particular.
 */
interface VehiculoParticular {
  vendedor_tipo: 'PARTICULAR';
  vendedor_persona_id: string;
  vendedor_empresa_id: null;
}

/**
 * Vehículo cuyo vendedor es un ente jurídico (ALIADO_COMERCIAL o CONCESIONARIO).
 * Se usa 'EMPRESA' deliberadamente para no colisionar con tipo_empresa_enum.
 */
interface VehiculoEmpresa {
  vendedor_tipo: 'EMPRESA';
  vendedor_persona_id: null;
  vendedor_empresa_id: string;
}

type VehiculoVendedor = VehiculoParticular | VehiculoEmpresa;

interface VehiculoBase {
  id: string;
  propietario_id: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  color: string;
  motor: string | null;
  traccion: string | null;
  tipo_vehiculo: TipoVehiculo;          // CARGA, SEDAN, SUV, MINIVAN, PICKUP, MOTO
  transmision: Transmision;
  kilometraje: number;
  combustible: Combustible;
  cantidad_puertas: number | null;
  cantidad_ejes: number | null;
  cantidad_duenos: number;
  serial_motor: string;                 // Oculto en publicación pública
  serial_carroceria: string;            // Oculto en publicación pública
  placas: string;                       // Oculto en publicación pública
  papeles_al_dia: boolean;
  precio: string;                       // DECIMAL(12,2) → string (DIRECTRICES §2: no float para dinero)
  negociable: boolean;
  observacion: string | null;
  ubicacion: Ubicacion;
  imagenes_url: string[];
  /**
   * auth.uid() del usuario que ejecutó el INSERT.
   * Propósitos: RLS sin subconsulta + auditoría de empleado exacto en empresas.
   * La política RLS usa: USING (creado_por_auth_id = auth.uid())
   */
  creado_por_auth_id: string;
  created_at: string;
  deleted_at: string | null;

  // ── Campos de plan de publicación (024_planes_publicacion.sql) ──────────────
  /** Plan activo del anuncio. DEFAULT 'BASICO' en BD. */
  tipo_plan: TipoPlan;
  /**
   * Fecha límite de visibilidad. BASICO: +15 días. DESTACADO: +45 días.
   * NULL solo en registros anteriores a la migración 024.
   */
  fecha_expiracion_plan: string | null; // TIMESTAMPTZ → ISO 8601 string
  /** Número de renovaciones del plan BASICO pagadas ($1 USD + IVA c/u). */
  renovaciones_basico: number;
  /**
   * Precio cobrado por el plan en USD almacenado como string (DECIMAL → string
   * para no incurrir en errores de coma flotante — DIRECTRICES §2).
   * BASICO: '0.00'. DESTACADO: '5.00'. IVA se calcula en runtime.
   */
  precio_plan_usd: string;

  // ── Campos de ciclo de vida y métricas (032_estado_publicacion.sql) ─────────
  /**
   * Estado de la publicación. DEFAULT 'ACTIVO' en BD.
   * Gestión via RPC actualizar_estado_publicacion_vehiculo().
   */
  estado: EstadoPublicacion;
  estado_verificacion: EstadoVerificacion;
  /**
   * Fecha en que se marcó como VENDIDO. NULL si estado ≠ VENDIDO.
   * El catálogo público oculta el vehículo cuando NOW() > fecha_venta + 7 días.
   */
  fecha_venta: string | null; // TIMESTAMPTZ → ISO 8601 string
  /** Contador atómico de visitas a la página de detalle. Incrementado por RPC. */
  vistas: number;
}


export type Vehiculo = VehiculoBase & VehiculoVendedor;

export type VehiculoInsert = Omit<VehiculoBase, 'id' | 'created_at' | 'deleted_at'> &
  VehiculoVendedor & {
    version?: string | null;
    motor?: string | null;
    traccion?: string | null;
    cantidad_puertas?: number | null;
    cantidad_ejes?: number | null;
    cantidad_duenos?: number;
    negociable?: boolean;
    observacion?: string | null;
    ubicacion?: Ubicacion;
  };

export type VehiculoUpdate = Partial<Omit<VehiculoInsert, 'vendedor_tipo' | 'vendedor_persona_id' | 'vendedor_empresa_id'>>;

// ---------------------------------------------------------------------------
// Tabla: categorias_repuestos (005_create_repuestos.sql)
// ---------------------------------------------------------------------------

export interface CategoriaRepuesto {
  id: string;
  nombre: string;
}

// ---------------------------------------------------------------------------
// Tabla: repuestos (005_create_repuestos.sql)
// ---------------------------------------------------------------------------

interface RepuestoParticular {
  vendedor_tipo: 'PARTICULAR';
  vendedor_persona_id: string;
  vendedor_empresa_id: null;
}

interface RepuestoEmpresa {
  vendedor_tipo: 'EMPRESA';
  vendedor_persona_id: null;
  vendedor_empresa_id: string;
}

type RepuestoVendedor = RepuestoParticular | RepuestoEmpresa;

interface RepuestoBase {
  id: string;
  categoria_id: string;
  nombre_repuesto: string;
  marca_repuesto: string | null;   // Fabricante del repuesto (Ej: Bosch). NO confundir con marca del vehículo.
  numero_parte: string | null;     // "NRO DE AUTOPARTE" en el formulario
  es_nuevo: boolean;
  precio: string;                  // DECIMAL(12,2) → string
  stock?: number;                  // Control atómico de inventario (SELECT ... FOR UPDATE)
  especificaciones?: Record<string, unknown>;
  negociable: boolean;
  observacion: string | null;
  ubicacion: Ubicacion;
  imagenes_url: string[];
  /**
   * auth.uid() del usuario que ejecutó el INSERT.
   * Propósitos: RLS sin subconsulta + auditoría de empleado exacto en empresas.
   */
  creado_por_auth_id: string;
  created_at: string;
  deleted_at: string | null;

  // ── Campos de ciclo de vida y métricas (032_estado_publicacion.sql) ─────────
  /** Estado de la publicación. DEFAULT 'ACTIVO' en BD. */
  estado: EstadoPublicacion;
  estado_verificacion: EstadoVerificacion;
  /** Fecha en que se marcó como VENDIDO. NULL si estado ≠ VENDIDO. */
  fecha_venta: string | null; // TIMESTAMPTZ → ISO 8601 string
  /** Contador atómico de visitas a la página de detalle del repuesto. */
  vistas: number;
}

export type Repuesto = RepuestoBase & RepuestoVendedor;

export type RepuestoInsert = Omit<RepuestoBase, 'id' | 'created_at' | 'deleted_at'> &
  RepuestoVendedor & {
    marca_repuesto?: string | null;
    numero_parte?: string | null;
    negociable?: boolean;
    observacion?: string | null;
    ubicacion?: Ubicacion;
  };

export type RepuestoUpdate = Partial<Omit<RepuestoInsert, 'vendedor_tipo' | 'vendedor_persona_id' | 'vendedor_empresa_id'>>;

// ---------------------------------------------------------------------------
// Tabla: compatibilidad_repuestos (005_create_repuestos.sql)
// Importante: Los campos MARCA y MODELO del formulario "REPUESTO" de tu jefe
// se refieren al VEHÍCULO compatible, NO al repuesto mismo. Van aquí.
// ---------------------------------------------------------------------------

export interface CompatibilidadRepuesto {
  id: string;
  repuesto_id: string;
  marca_vehiculo: string;    // "MARCA" en el formulario de repuesto del jefe
  modelo_vehiculo: string;   // "MODELO" en el formulario de repuesto del jefe
  anio_desde: number;
  anio_hasta: number;
}

export type CompatibilidadRepuestoInsert = Omit<CompatibilidadRepuesto, 'id'>;

// ---------------------------------------------------------------------------
// Tabla: favoritos (013_create_favoritos.sql)
// ---------------------------------------------------------------------------

export interface Favorito {
  id: string;
  user_id: string;
  vehiculo_id: string;
  created_at: string;
}

export type FavoritoInsert = Omit<Favorito, 'id' | 'created_at'>;

// ---------------------------------------------------------------------------
// Tabla: preguntas (015_create_preguntas.sql)
// ---------------------------------------------------------------------------

export interface Pregunta {
  id: string;
  vehiculo_id: string | null;
  repuesto_id: string | null;
  user_id: string;
  texto: string;
  respuesta: string | null;
  created_at: string;
  updated_at: string;
}

export type PreguntaInsert = Omit<Pregunta, 'id' | 'created_at' | 'updated_at'>;

// ---------------------------------------------------------------------------
// Tabla: notificaciones (030_create_notificaciones.sql)
// ---------------------------------------------------------------------------

export interface Notificacion {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leido: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export type NotificacionInsert = Omit<Notificacion, 'id' | 'created_at'>;


// ---------------------------------------------------------------------------
// Tipos auxiliares para consultas con JOIN (vistas enriquecidas)
// ---------------------------------------------------------------------------

/** Nombre completo de una persona */
export type NombreCompleto = Pick<Persona, 'id' | 'nombres' | 'apellidos' | 'cedula_pasaporte' | 'telefonos'>;

/** Vehículo con datos del propietario resueltos */
export type VehiculoConPropietario = Vehiculo & {
  propietario: NombreCompleto;
};

/** Repuesto con su categoría resuelta */
export type RepuestoConCategoria = Repuesto & {
  categoria: CategoriaRepuesto;
};

/** Repuesto con sus compatibilidades de vehículo */
export type RepuestoConCompatibilidades = RepuestoConCategoria & {
  compatibilidades: CompatibilidadRepuesto[];
};

/** Empresa con sus empleados y representantes */
export type EmpresaConPersonal = Empresa & {
  empleados: Array<EmpleadoEmpresa & { persona: NombreCompleto }>;
};
