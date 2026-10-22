INSERT INTO categorias_repuestos (nombre) VALUES
  ('Motor y Componentes'),
  ('Suspensión y Dirección'),
  ('Frenos'),
  ('Transmisión y Caja'),
  ('Sistema Eléctrico'),
  ('Carrocería e Interiores'),
  ('Refrigeración y Calefacción'),
  ('Cauchos y Rines'),
  ('Filtros y Mantenimiento'),
  ('Accesorios'),
  ('Otros')
ON CONFLICT (nombre) DO NOTHING;
