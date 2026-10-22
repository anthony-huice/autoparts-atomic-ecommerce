-- =============================================================================
-- AutoParts Pro — Datos Semilla Realistas (20 Repuestos en 4 Categorías)
-- =============================================================================
-- Incluye ítems con stock = 2 para probar el bloqueo atómico de concurrencia
-- (SELECT ... FOR UPDATE) desde el Recruiter Sandbox Mode.
-- =============================================================================

-- 1. Asegurar las 4 categorías principales del catálogo técnico
INSERT INTO public.categorias_repuestos (nombre) VALUES
  ('Sistema de Frenos'),
  ('Suspensión y Dirección'),
  ('Filtros y Lubricantes'),
  ('Sistema Eléctrico y Encendido')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Crear empresa demostrativa de marca blanca (AutoParts Pro Demo Corp.)
DO $$
DECLARE
  v_demo_user_id UUID;
  v_empresa_id   UUID := '11111111-2222-3333-4444-555555555555';
  v_cat_frenos   UUID;
  v_cat_susp     UUID;
  v_cat_filtros  UUID;
  v_cat_elec     UUID;
BEGIN
  SELECT id INTO v_demo_user_id FROM auth.users LIMIT 1;

  -- Si existe un usuario base en auth.users, poblar los 20 repuestos vinculados
  IF v_demo_user_id IS NOT NULL THEN
    INSERT INTO public.empresas (
      id, tipo_empresa, razon_social, nombre_comercial, rif, direccion,
      telefonos, correo, pagina_web, ubicacion, estado_verificacion
    ) VALUES (
      v_empresa_id,
      'ALIADO_COMERCIAL',
      'AutoParts Pro Demo Corp. C.A.',
      'AutoParts Pro Oficial',
      'J-50099887-1',
      'Parque Industrial Norte, Galpón 14',
      ARRAY['+58 412-0001122'],
      'catalog@autopartspro.demo',
      'https://autopartspro.demo',
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      'APROBADO'
    ) ON CONFLICT (id) DO NOTHING;

    SELECT id INTO v_cat_frenos  FROM public.categorias_repuestos WHERE nombre = 'Sistema de Frenos' LIMIT 1;
    SELECT id INTO v_cat_susp    FROM public.categorias_repuestos WHERE nombre = 'Suspensión y Dirección' LIMIT 1;
    SELECT id INTO v_cat_filtros FROM public.categorias_repuestos WHERE nombre = 'Filtros y Lubricantes' LIMIT 1;
    SELECT id INTO v_cat_elec    FROM public.categorias_repuestos WHERE nombre = 'Sistema Eléctrico y Encendido' LIMIT 1;

    -- =========================================================================
    -- CATEGORÍA 1: SISTEMA DE FRENOS (5 SKUs)
    -- =========================================================================
    INSERT INTO public.repuestos (
      categoria_id, vendedor_tipo, vendedor_empresa_id, nombre_repuesto, marca_repuesto,
      numero_parte, es_nuevo, precio, stock, negociable, observacion, especificaciones,
      ubicacion, imagenes_url, creado_por_auth_id, estado, estado_verificacion
    ) VALUES
    (v_cat_frenos, 'EMPRESA', v_empresa_id, 'Juego de Pastillas de Freno Cerámicas Delanteras QuietCast', 'Bosch', 'BRK-BOSCH-0986', TRUE, 54.00, 2, FALSE,
      'Compuesto cerámico de baja emisión de polvo y laminilla antirruido multicapa.',
      '{"material": "Cerámica Avanzada", "posicion": "Delantera", "incluye_herrajes": true, "norma": "ECE-R90"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_frenos, 'EMPRESA', v_empresa_id, 'Par de Discos de Freno Ventilados Ranurados UV Coated', 'Brembo', 'BRK-BREMBO-09A417', TRUE, 128.50, 4, FALSE,
      'Recubrimiento anticorrosión UV y ventilación por pilares para disipación térmica extrema.',
      '{"diametro_mm": 296, "espesor_mm": 28, "perforaciones": 5, "aleacion": "Alto Carbono"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_frenos, 'EMPRESA', v_empresa_id, 'Bomba Central Cilindro Maestro de Freno en Aluminio', 'TRW', 'BRK-TRW-PMK621', TRUE, 89.00, 2, FALSE,
      'Cuerpo en aleación ligera con sellos EPDM resistentes a líquido DOT 4 y DOT 5.1.',
      '{"diametro_embolo_mm": 23.8, "circuitos": 2, "fluido_recomendado": "DOT 4"}'::JSONB,
      '{"estado": "Carabobo", "ciudad": "Valencia"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_frenos, 'EMPRESA', v_empresa_id, 'Kit de Mordazas Caliper de Freno Delantero Remanufacturado OEM', 'Akebono', 'BRK-AKE-ACT1210', TRUE, 145.00, 3, FALSE,
      'Pistones fenólicos de doble sellado probados hidrostáticamente a 2.500 PSI.',
      '{"pistones": 2, "diametro_piston_mm": 45, "acabado": "Zincado Anticorrosivo"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_frenos, 'EMPRESA', v_empresa_id, 'Sensor Electrónico de Velocidad de Rueda ABS Delantero', 'Continental ATE', 'BRK-ATE-240711', TRUE, 38.00, 7, FALSE,
      'Sensor Hall de alta precisión resistente a inmersión IP68.',
      '{"tipo_sensor": "Efecto Hall Activo", "longitud_cable_mm": 740, "polos": 2}'::JSONB,
      '{"estado": "Lara", "ciudad": "Barquisimeto"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    -- =========================================================================
    -- CATEGORÍA 2: SUSPENSIÓN Y DIRECCIÓN (5 SKUs)
    -- =========================================================================
    (v_cat_susp, 'EMPRESA', v_empresa_id, 'Par de Amortiguadores a Gas Presurizados Excel-G Delanteros', 'KYB', 'SUS-KYB-339114', TRUE, 162.00, 2, FALSE,
      'Válvula de tres etapas con nitrógeno a baja presión y vástago cromado en duro.',
      '{"sistema": "Bitubo Gas Nitrógeno", "posicion": "Eje Delantero", "garantia_km": 60000}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_susp, 'EMPRESA', v_empresa_id, 'Meseta Inferior de Suspensión Forjada con Muñón y Bujes', 'Moog', 'SUS-MOOG-RK6203', TRUE, 96.00, 5, FALSE,
      'Acero estampado con recubrimiento cataforético y muñón engrasable de alta carga.',
      '{"lado": "Izquierdo Conductor", "incluye_munon": true, "bujes_instalados": true}'::JSONB,
      '{"estado": "Carabobo", "ciudad": "Valencia"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_susp, 'EMPRESA', v_empresa_id, 'Cajetín Cremallera de Dirección Electro-Asistida (EPS)', 'Delphi', 'SUS-DELPHI-TA5590', TRUE, 310.00, 2, FALSE,
      'Cremallera completa con terminales axiales y guardapolvos de neopreno.',
      '{"asistencia": "Eléctrica EPS", "vueltas_tope_a_tope": 2.8, "incluye_axiales": true}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_susp, 'EMPRESA', v_empresa_id, 'Kit de Rodamiento y Cubo de Rueda Delantera con Encoder ABS', 'SKF', 'SUS-SKF-VKBA6891', TRUE, 78.50, 6, FALSE,
      'Unidad sellada de tercera generación prelubricada de por vida.',
      '{"birlos": 5, "anillo_magnetico_abs": true, "par_apriete_nm": 210}'::JSONB,
      '{"estado": "Zulia", "ciudad": "Maracaibo"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_susp, 'EMPRESA', v_empresa_id, 'Par de Bieletas Lápices de Barra Estabilizadora Reforzados', 'Lemförder', 'SUS-LEM-3547201', TRUE, 42.00, 9, FALSE,
      'Rótulas esféricas templadas por inducción para caminos de alta exigencia.',
      '{"longitud_mm": 285, "rosca": "M12x1.5", "material": "Acero Forjado"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    -- =========================================================================
    -- CATEGORÍA 3: FILTROS Y LUBRICANTES (5 SKUs)
    -- =========================================================================
    (v_cat_filtros, 'EMPRESA', v_empresa_id, 'Filtro de Aceite Blindado con Válvula Anti-Retorno en Silicona', 'Mann-Filter', 'FLT-MANN-W71295', TRUE, 16.50, 12, FALSE,
      'Medio filtrante sintético capaz de retener partículas de hasta 12 micras.',
      '{"presion_bypass_bar": 2.5, "rosca": "3/4-16 UNF", "intervalo_km": 15000}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1635784063388-1ff609e12d7c?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_filtros, 'EMPRESA', v_empresa_id, 'Galón de Aceite 100% Sintético 5W-30 API SP / ILSAC GF-6A', 'Mobil 1', 'FLT-MOBIL-5W30SP', TRUE, 46.00, 8, FALSE,
      'Protección antidesgaste avanzada para motores turboalimentados GDI y atmosféricos.',
      '{"viscosidad": "5W-30", "volumen_litros": 3.785, "norma_api": "SP / GF-6A"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_filtros, 'EMPRESA', v_empresa_id, 'Filtro de Aire de Admisión de Alto Flujo Lavable', 'K&N', 'FLT-KN-332480', TRUE, 69.00, 2, FALSE,
      'Malla de algodón multicapa aceitada que incrementa el flujo volumétrico de admisión.',
      '{"dimensiones_mm": "292x200x32", "reutilizable": true, "eficiencia_filtracion": "98.8%"}'::JSONB,
      '{"estado": "Miranda", "ciudad": "Guarenas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_filtros, 'EMPRESA', v_empresa_id, 'Filtro Separador de Agua y Combustible Diésel Common-Rail', 'Mahle Knecht', 'FLT-MAHLE-KC101', TRUE, 34.00, 5, FALSE,
      'Separación de agua >96% para proteger inyectores piezoeléctricos de alta presión.',
      '{"micraje": 4, "drenaje_agua": "Rosca Inferior Sensorizada"}'::JSONB,
      '{"estado": "Anzoátegui", "ciudad": "Barcelona"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_filtros, 'EMPRESA', v_empresa_id, 'Kit de Mantenimiento Transmisión Automática CVT (Filtro + Fluido)', 'Aisin', 'FLT-AISIN-CVTF4L', TRUE, 95.00, 3, FALSE,
      'Incluye filtro metálico de cárter, empacadura en nitrilo y 4 litros de fluido sintético.',
      '{"compatibilidad": "CVT Cadena y Correa", "incluye_empacadura": true}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1597762470488-3877b1f538c6?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    -- =========================================================================
    -- CATEGORÍA 4: SISTEMA ELÉCTRICO Y ENCENDIDO (5 SKUs)
    -- =========================================================================
    (v_cat_elec, 'EMPRESA', v_empresa_id, 'Set de 4 Bujías de Iridio Twin-Tip de Larga Duración', 'Denso', 'ELC-DENSO-SK20R11', TRUE, 48.00, 2, FALSE,
      'Electrodo central de iridio de 0.4 mm soldado por láser con punta de platino a tierra.',
      '{"grado_termico": 20, "gap_mm": 1.1, "vida_util_km": 100000}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_elec, 'EMPRESA', v_empresa_id, 'Alternador Trifásico de 130 Amperios con Polea Embragada OAP', 'Valeo', 'ELC-VALEO-439672', TRUE, 215.00, 2, FALSE,
      'Regulador inteligente controlado por bus LIN/COM y rectificador de avalancha.',
      '{"corriente_carga_a": 130, "voltaje_nominal_v": 14, "canales_polea": 6}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_elec, 'EMPRESA', v_empresa_id, 'Bobina de Encendido Directo Tipo Lápiz (COP)', 'NGK', 'ELC-NGK-U5055', TRUE, 44.00, 6, FALSE,
      'Devanado secundario aislado en resina epóxica al vacío resistente a 42.000 V.',
      '{"pines_conector": 4, "configuracion": "Coil-on-Plug (COP)"}'::JSONB,
      '{"estado": "Carabobo", "ciudad": "Valencia"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_elec, 'EMPRESA', v_empresa_id, 'Motor de Arranque Planetario Reductor de 1.4 kW', 'Hitachi Astemo', 'ELC-HIT-S114902', TRUE, 168.00, 3, FALSE,
      'Alto par de arranque en frío con consumo reducido de corriente de batería.',
      '{"potencia_kw": 1.4, "dientes_bendix": 9, "sentido_giro": "Horario CW"}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO'),

    (v_cat_elec, 'EMPRESA', v_empresa_id, 'Módulo Bomba de Combustible Sumergible de Alta Presión', 'Delphi', 'ELC-DELPHI-FG1184', TRUE, 118.00, 4, FALSE,
      'Turbina regenerativa silenciosa con sensor de nivel de flotador calibrado por láser.',
      '{"presion_operacion_bar": 3.8, "caudal_lph": 135, "incluye_flotador": true}'::JSONB,
      '{"estado": "Distrito Capital", "ciudad": "Caracas"}'::JSONB,
      ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80'],
      v_demo_user_id, 'ACTIVO', 'APROBADO');
  END IF;
END $$;
