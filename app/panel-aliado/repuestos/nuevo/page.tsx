"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "@/components/ui/image-upload";
import { useSession } from "@/hooks/useSession";
import { Plus, Trash2 } from "lucide-react";
const compatibilidadSchema = z
  .object({
    marca_vehiculo: z.string().min(2, "Obligatorio"),
    modelo_vehiculo: z.string().min(2, "Obligatorio"),
    anio_desde: z.coerce.number().int().min(1900),
    anio_hasta: z.coerce
      .number()
      .int()
      .max(new Date().getFullYear() + 1),
  })
  .refine((data) => data.anio_hasta >= data.anio_desde, {
    message: "Inválido (hasta < desde)",
    path: ["anio_hasta"],
  });
const repuestoSchema = z
  .object({
    categoria_id: z.string().uuid("Seleccione una categoría"),
    nombre_repuesto: z.string().min(2, "Obligatorio"),
    marca_repuesto: z.string().optional(),
    numero_parte: z.string().optional(),
    es_nuevo: z.boolean(),
    imagenes_url: z.array(z.string()).min(1, "Es obligatorio subir una foto"),
    precio: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Formato numérico inválido (Ej: 1500.00)"),
    negociable: z.boolean(),
    observacion: z.string().optional(),
    compatibilidades: z.array(compatibilidadSchema),
  });
type RepuestoFormValues = z.infer<typeof repuestoSchema>;
export default function NuevoRepuestoPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [isConcesionarioOnly, setIsConcesionarioOnly] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RepuestoFormValues>({
    resolver: zodResolver(repuestoSchema) as any,
    defaultValues: {
      es_nuevo: true,
      negociable: false,
      compatibilidades: [], // Si está vacío es repuesto universal
      imagenes_url: [], // Imagen por defecto
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "compatibilidades",
  });
  const imagenesUrl = watch("imagenes_url") || [];

  useEffect(() => {
    async function loadData() {
      // Load Categories
      const { data: cats } = await supabase
        .from("categorias_repuestos")
        .select("*")
        .order("nombre");
      if (cats) setCategorias(cats);

      if (!user) return;
      setIsLoadingProfile(true);
      const { data: p } = await supabase
        .from("personas")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      if (p) {
        setPersonaId(p.id);
        const { data: e } = await supabase
          .from("empleados_empresa")
          .select("empresa_id, empresas(tipo_empresa, razon_social, nombre_comercial)")
          .eq("persona_id", p.id);
        if (e && e.length > 0) {
          const activeEmpresas = e.filter((item: any) => item.empresas);
          const hasAliado = activeEmpresas.some((item: any) => item.empresas.tipo_empresa === 'ALIADO_COMERCIAL');
          
          if (!hasAliado) {
             setIsConcesionarioOnly(true);
          } else {
             setEmpresas(activeEmpresas.map((item: any) => ({ id: item.empresa_id, ...item.empresas })));
          }
        } else {
          setIsConcesionarioOnly(true);
        }
      }
      setIsLoadingProfile(false);
    }
    loadData();
  }, [user, supabase]);

  const mutation = useMutation({
    mutationFn: async (data: RepuestoFormValues) => {
      if (!user || !personaId) throw new Error("Falta perfil de usuario");

      let v_tipo = "PARTICULAR";
      let v_empresa_id = null;
      if (empresas.length > 0) {
         const aliado = empresas.find(e => e.tipo_empresa === 'ALIADO_COMERCIAL');
         if (aliado) {
             v_tipo = "EMPRESA";
             v_empresa_id = aliado.id;
         }
      }

      const p_repuesto_data: any = {
        categoria_id: data.categoria_id,
        nombre_repuesto: data.nombre_repuesto,
        marca_repuesto: data.marca_repuesto || null,
        numero_parte: data.numero_parte || null,
        es_nuevo: data.es_nuevo,
        precio: data.precio,
        negociable: data.negociable,
        observacion: data.observacion || null,
        vendedor_tipo: v_tipo,
        imagenes_url: data.imagenes_url,
      };

      if (v_tipo === "PARTICULAR") {
        p_repuesto_data.vendedor_persona_id = personaId;
        p_repuesto_data.vendedor_empresa_id = null;
      } else {
        p_repuesto_data.vendedor_persona_id = null;
        p_repuesto_data.vendedor_empresa_id = v_empresa_id;
      }

      const { data: repuestoId, error } = await supabase.rpc(
        "insertar_repuesto_con_compatibilidad",
        {
          p_repuesto_data,
          p_compatibilidades: data.compatibilidades,
        },
      );
      if (error) throw error;
      return repuestoId;
    },
    onSuccess: () => {
      toast.success("Repuesto publicado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["repuestos"] });
      router.push("/panel-aliado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al publicar repuesto");
    },
  });

  if (isLoadingProfile) {
    return <div className="p-8 text-center text-gray-500">Cargando perfil...</div>;
  }

  if (isConcesionarioOnly) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto bg-white border border-gray-100 rounded-none">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" strokeWidth={1.5} />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
        <p className="text-gray-600 mb-8 max-w-md">
            Solo los talleres y tiendas de repuestos (Aliado Comercial) pueden publicar repuestos en la plataforma.
        </p>
        <Link 
            href="/panel-aliado/empresa/nueva" 
            className="inline-flex items-center justify-center bg-[#1e40af] hover:bg-blue-900 text-white rounded-none px-8 py-3 font-medium transition-colors"
        >
            Registrar Aliado Comercial
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-none border border-gray-100">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Publicar Repuesto
        </h1>
        <p className="mt-2 text-gray-600">
          Completa la información técnica, su categorización y las
          compatibilidades con diferentes vehículos (Opcional).
        </p>
      </div>
      <form
        onSubmit={handleSubmit((data: any) => mutation.mutate(data))}
        className="space-y-8"
      >
        {/* Imágenes */}
        <div className="bg-white p-6 rounded-none border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Fotografías del Repuesto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((index) => (
              <ImageUpload
                key={index}
                bucket="inventario"
                folderPath={`repuestos/${user?.id || "temp"}`}
                className="rounded-none"
                defaultImage={imagenesUrl[index] || ""}
                onUploadSuccess={(url) => {
                  const newImages = [...imagenesUrl];
                  if (url) {
                    newImages[index] = url;
                  } else {
                    newImages.splice(index, 1);
                  }
                  setValue(
                    "imagenes_url",
                    newImages.filter(Boolean),
                    { shouldValidate: true },
                  );
                }}
              />
            ))}
          </div>
          {errors.imagenes_url && (
            <p className="text-xs text-red-600 mt-2">
              {errors.imagenes_url.message}
            </p>
          )}
        </div>

        {/* Datos Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label>Categoría del Repuesto</Label>
            <Select {...register("categoria_id")} disabled={mutation.isPending} className="rounded-none">
              <option value="" disabled>Selecciona una categoría...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            {errors.categoria_id && (
              <p className="text-xs text-red-600">
                {errors.categoria_id.message}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Nombre de la Pieza / Repuesto</Label>
            <Input
              placeholder="Ej: Alternador 12V 90Amp"
              {...register("nombre_repuesto")}
              disabled={mutation.isPending}
            />
            {errors.nombre_repuesto && (
              <p className="text-xs text-red-600">
                {errors.nombre_repuesto.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Marca del Repuesto (Fabricante)</Label>
            <Input
              placeholder="Ej: Bosch"
              {...register("marca_repuesto")}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Número de Parte (Serial)</Label>
            <Input
              placeholder="Ej: AL-00123"
              {...register("numero_parte")}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2 flex items-center h-full pt-6">
            <Label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-none border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                {...register("es_nuevo")}
                disabled={mutation.isPending}
              />
              <span>¿Es Nuevo de paquete?</span>
            </Label>
          </div>
        </div>
        {/* Sección de Compatibilidad Dinámica (Field Array) */}
        <div className="bg-white p-6 rounded-none border border-gray-200 ">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Compatibilidad con Vehículos
              </h3>
              <p className="text-sm text-gray-500">
                ¿Para qué carros sirve? Déjalo vacío si es un repuesto
                universal.
              </p>
            </div>
            <Button
              type="button"
              onClick={() =>
                append({
                  marca_vehiculo: "",
                  modelo_vehiculo: "",
                  anio_desde: 2000,
                  anio_hasta: new Date().getFullYear(),
                })
              }
              disabled={mutation.isPending}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar Vehículo
            </Button>
          </div>
          {fields.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-none bg-gray-50">
              <p className="text-sm text-gray-500">
                Repuesto marcado como Universal (Sirve para todo vehículo).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-wrap md:flex-nowrap gap-3 items-start p-4 bg-gray-50 rounded-none border border-gray-100"
                >
                  <div className="w-full md:w-1/4">
                    <Label className="text-xs">Marca Compatible</Label>
                    <Input
                      placeholder="Toyota"
                      {...register(`compatibilidades.${index}.marca_vehiculo`)}
                      disabled={mutation.isPending}
                    />
                    {errors.compatibilidades?.[index]?.marca_vehiculo && (
                      <p className="text-[10px] text-red-600 mt-1">
                        {errors.compatibilidades[index].marca_vehiculo.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full md:w-1/4">
                    <Label className="text-xs">Modelo Compatible</Label>
                    <Input
                      placeholder="Corolla"
                      {...register(`compatibilidades.${index}.modelo_vehiculo`)}
                      disabled={mutation.isPending}
                    />
                    {errors.compatibilidades?.[index]?.modelo_vehiculo && (
                      <p className="text-[10px] text-red-600 mt-1">
                        {errors.compatibilidades[index].modelo_vehiculo.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full md:w-1/6">
                    <Label className="text-xs">Año Desde</Label>
                    <Input
                      type="number"
                      {...register(`compatibilidades.${index}.anio_desde`)}
                      disabled={mutation.isPending}
                    />
                  </div>
                  <div className="w-full md:w-1/6">
                    <Label className="text-xs">Año Hasta</Label>
                    <Input
                      type="number"
                      {...register(`compatibilidades.${index}.anio_hasta`)}
                      disabled={mutation.isPending}
                    />
                    {errors.compatibilidades?.[index]?.anio_hasta && (
                      <p className="text-[10px] text-red-600 mt-1">
                        {errors.compatibilidades[index].anio_hasta.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full md:w-auto flex items-end pt-5">
                    <Button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={mutation.isPending}
                      className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none flex-shrink-0 bg-transparent border-none "
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Sección Comercial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          <div className="space-y-2">
            <Label>Precio (String exacto)</Label>
            <Input
              placeholder="85.50"
              {...register("precio")}
              disabled={mutation.isPending}
            />
            {errors.precio && (
              <p className="text-xs text-red-600">{errors.precio.message}</p>
            )}
          </div>
          <div className="space-y-2 flex items-center h-full pt-6">
            <Label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-none border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                {...register("negociable")}
                disabled={mutation.isPending}
              />
              <span>¿Precio negociable?</span>
            </Label>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Observación adicional</Label>
            <Input
              placeholder="Ej: Descuento si lleva 2 o más..."
              {...register("observacion")}
              disabled={mutation.isPending}
            />
          </div>
        </div>
        <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => router.back()}
            disabled={mutation.isPending}
            className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 px-6"
          >
            {" "}
            Cancelar{" "}
          </Button>
          <Button
            type="submit"
            className="px-10 h-10 text-sm "
            disabled={mutation.isPending}
          >
            {" "}
            {mutation.isPending ? "Publicando..." : "Publicar Repuesto"}{" "}
          </Button>
        </div>
      </form>
    </div>
  );
}
