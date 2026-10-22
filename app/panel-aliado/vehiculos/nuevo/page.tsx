"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { ImageUpload } from "@/components/ui/image-upload";
const vehiculoSchema = z
  .object({
    marca: z.string().min(2, "Obligatorio").toUpperCase().trim(),
    modelo: z.string().min(2, "Obligatorio").toUpperCase().trim(),
    anio: z.coerce
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1),
    version: z.string().optional(),
    motor: z.string().optional(),
    traccion: z.string().optional(),
    color: z.string().min(2, "Obligatorio"),
    tipo_vehiculo: z.enum([
      "CARGA",
      "SEDAN",
      "SUV",
      "MINIVAN",
      "PICKUP",
      "MOTO",
    ]),
    transmision: z.enum(["AUTOMATICO", "SINCRONICO", "DUAL"]),
    kilometraje: z.coerce.number().int().min(0),
    combustible: z.enum(["DIESEL", "GASOLINA", "GAS", "ELECTRICO"]),
    cantidad_puertas: z.coerce.number().int().nullable().optional(),
    cantidad_ejes: z.coerce.number().int().min(1).optional(),
    cantidad_duenos: z.coerce.number().int().min(1),
    serial_motor: z.string().min(3, "Obligatorio"),
    serial_carroceria: z.string().min(3, "Obligatorio"),
    placas: z.string().min(2, "Obligatorio"),
    papeles_al_dia: z.boolean(),
    precio: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Formato numérico inválido (Ej: 1500.00)"),
    negociable: z.boolean(),
    observacion: z.string().optional(),
    estado_ubicacion: z.string().optional(),
    ciudad_ubicacion: z.string().regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, "No se permiten números").optional(),
    imagenes_url: z.array(z.string()).min(1, "Debe subir al menos una foto"),
  });

type VehiculoFormValues = z.infer<typeof vehiculoSchema>;

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [isAliadoOnly, setIsAliadoOnly] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Estados para monetización (Particular)
  const [activeVehiclesCount, setActiveVehiclesCount] = useState<number>(0);
  const [totalVehiclesCount, setTotalVehiclesCount] = useState<number>(0);
  const [isParticular, setIsParticular] = useState(false);

  // Estados para monetización (Empresa)
  const [empresaPlan, setEmpresaPlan] = useState<string>("BASICO");
  const [empresaActiveVehicles, setEmpresaActiveVehicles] = useState<number>(0);
  const [isEmpresaLimitReached, setIsEmpresaLimitReached] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<VehiculoFormValues>({
    resolver: zodResolver(vehiculoSchema) as any,
    defaultValues: {
      tipo_vehiculo: "SEDAN",
      transmision: "AUTOMATICO",
      combustible: "GASOLINA",
      papeles_al_dia: true,
      negociable: false,
      imagenes_url: [],
      version: "",
      motor: "",
      traccion: "",
      estado_ubicacion: "",
      ciudad_ubicacion: "",
    },
  });
  const imagenesUrl = watch("imagenes_url") || [];
  
  useEffect(() => {
    async function loadProfile() {
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
          const hasConcesionario = activeEmpresas.some((item: any) => item.empresas.tipo_empresa === 'CONCESIONARIO');
          const hasAliado = activeEmpresas.some((item: any) => item.empresas.tipo_empresa === 'ALIADO_COMERCIAL');
          
          if (!hasConcesionario && hasAliado) {
             setIsAliadoOnly(true);
          } else if (hasConcesionario) {
             const concesionarios = activeEmpresas.map((item: any) => ({ id: item.empresa_id, ...item.empresas }));
             setEmpresas(concesionarios);
             
             const mainEmpresaId = concesionarios.find((c: any) => c.tipo_empresa === 'CONCESIONARIO').id;
             
             // Obtener plan
             const { data: suscripcion } = await supabase
               .from("empresa_suscripciones")
               .select("tipo_plan")
               .eq("empresa_id", mainEmpresaId)
               .single();
               
             const plan = suscripcion?.tipo_plan || "BASICO";
             setEmpresaPlan(plan);
             
             // Obtener vehículos activos de la empresa
             const { count } = await supabase
               .from("vehiculos")
               .select("*", { count: 'exact', head: true })
               .eq("vendedor_empresa_id", mainEmpresaId)
               .is("deleted_at", null)
               .neq("estado", "VENDIDO");
               
             const activos = count || 0;
             setEmpresaActiveVehicles(activos);
             
             let limite = 5; // Fallback
             if (plan === "DESTACADO") limite = 10;
             if (plan === "PREMIUM") limite = 30;

             if (activos >= limite) {
               setIsEmpresaLimitReached(true);
             }
          } else {
             // Es PARTICULAR (no tiene concesionario)
             setIsParticular(true);
             
             // Buscar historial
             const { data: vData } = await supabase
               .from("vehiculos")
               .select("id, estado, deleted_at")
               .eq("creado_por_auth_id", user.id)
               .eq("vendedor_tipo", "PARTICULAR");
               
             if (vData) {
               setTotalVehiclesCount(vData.length);
               const activos = vData.filter(v => v.deleted_at === null && (v.estado === 'ACTIVO' || v.estado === 'PAUSADO')).length;
               setActiveVehiclesCount(activos);
             }
          }
        } else {
           // Sin empresas, es particular puro
           setIsParticular(true);
           const { data: vData } = await supabase
               .from("vehiculos")
               .select("id, estado, deleted_at")
               .eq("creado_por_auth_id", user.id)
               .eq("vendedor_tipo", "PARTICULAR");
               
           if (vData) {
               setTotalVehiclesCount(vData.length);
               const activos = vData.filter(v => v.deleted_at === null && (v.estado === 'ACTIVO' || v.estado === 'PAUSADO')).length;
               setActiveVehiclesCount(activos);
           }
        }
      }
      setIsLoadingProfile(false);
    }
    loadProfile();
  }, [user, supabase]);
  const mutation = useMutation({
    mutationFn: async (data: VehiculoFormValues) => {
      if (!user || !personaId) throw new Error("Falta perfil de usuario"); // Construir payload según tipo de vendedor
      
      let v_tipo = "PARTICULAR";
      let v_empresa_id = null;
      if (empresas.length > 0) {
         const concesionario = empresas.find(e => e.tipo_empresa === 'CONCESIONARIO');
         if (concesionario) {
             v_tipo = "EMPRESA";
             v_empresa_id = concesionario.id;
         }
      }

      const payload: any = {
        propietario_id: personaId,
        creado_por_auth_id: user.id,
        marca: data.marca,
        modelo: data.modelo,
        version: data.version || null,
        anio: data.anio,
        color: data.color,
        motor: data.motor || null,
        traccion: data.traccion || null,
        tipo_vehiculo: data.tipo_vehiculo,
        transmision: data.transmision,
        kilometraje: data.kilometraje,
        combustible: data.combustible,
        cantidad_puertas: data.cantidad_puertas || null,
        cantidad_ejes: data.cantidad_ejes || null,
        cantidad_duenos: data.cantidad_duenos,
        serial_motor: data.serial_motor,
        serial_carroceria: data.serial_carroceria,
        placas: data.placas,
        papeles_al_dia: data.papeles_al_dia,
        precio: data.precio,
        negociable: data.negociable,
        observacion: data.observacion || null,
        vendedor_tipo: v_tipo,
        imagenes_url: data.imagenes_url,
      };
      if (v_tipo === "PARTICULAR") {
        payload.vendedor_persona_id = personaId;
        payload.vendedor_empresa_id = null;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("plan") === "DESTACADO") {
            payload.tipo_plan = "DESTACADO";
          }
        }
        if (data.estado_ubicacion && data.ciudad_ubicacion) {
          payload.ubicacion = {
            estado: data.estado_ubicacion,
            ciudad: data.ciudad_ubicacion.toUpperCase().trim()
          };
        }
      } else {
        payload.vendedor_persona_id = null;
        payload.vendedor_empresa_id = v_empresa_id;
      }
      const { error } = await supabase.rpc("publicar_vehiculo", { p_vehiculo: payload });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehículo publicado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] });
      router.push("/panel-aliado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al publicar vehículo");
    },
  });

  if (isLoadingProfile) {
    return <div className="p-8 text-center text-gray-500">Cargando perfil...</div>;
  }

  if (isAliadoOnly) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto bg-white border border-gray-100 rounded-none">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" strokeWidth={1.5} />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
        <p className="text-gray-600 mb-8 max-w-md">
            Los talleres/ventas de repuestos no pueden publicar vehículos. Registra un Concesionario.
        </p>
        <Link 
            href="/panel-aliado/empresa/nueva" 
            className="inline-flex items-center justify-center bg-[#1e40af] hover:bg-blue-900 text-white rounded-none px-8 py-3 font-medium transition-colors"
        >
            Registrar Concesionario
        </Link>
      </div>
    );
  }

  // Si es particular y ya tiene 1 vehículo activo
  if (isParticular && activeVehiclesCount >= 1) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto bg-white border border-gray-100 rounded-none">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" strokeWidth={1.5} />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Límite de Vehículos Alcanzado</h3>
        <p className="text-gray-600 mb-8 max-w-md">
            Como vendedor Particular solo puedes tener 1 vehículo publicado de forma simultánea. Para tener múltiples publicaciones, debes registrar un concesionario.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link 
              href="/panel-aliado/empresa/nueva" 
              className="inline-flex items-center justify-center bg-[#1e40af] hover:bg-blue-900 text-white rounded-none px-8 py-3 font-bold transition-colors"
          >
              Registrar Concesionario
          </Link>
          <Link 
              href="/panel-aliado/mis-publicaciones" 
              className="inline-flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-800 rounded-none px-8 py-3 font-bold transition-colors"
          >
              Gestionar mi Vehículo
          </Link>
        </div>
      </div>
    );
  }

  if (isEmpresaLimitReached) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto bg-white border border-gray-100 rounded-none shadow-sm mt-8">
        <ShieldAlert className="w-16 h-16 text-orange-500 mb-6" strokeWidth={1.5} />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Límite de Publicaciones Alcanzado</h3>
        <p className="text-gray-600 mb-8 max-w-md text-base leading-relaxed">
          Tu plan actual (<strong className="uppercase">{empresaPlan}</strong>) te permite tener un máximo de <strong>{empresaPlan === 'PREMIUM' ? '30' : (empresaPlan === 'DESTACADO' ? '10' : '5')}</strong> vehículos activos. Actualmente ya tienes {empresaActiveVehicles} publicados.
        </p>
        <div className="flex flex-col w-full max-w-sm gap-4">
          <Link 
            href="/panel-aliado/mi-plan" 
            className="w-full inline-flex items-center justify-center bg-[#1e40af] hover:bg-blue-900 text-white rounded-none px-6 py-4 font-bold transition-colors shadow-md"
          >
            Mejorar a Plan Destacado
          </Link>
          <Link 
            href="/panel-aliado/mis-publicaciones" 
            className="w-full inline-flex items-center justify-center bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-none px-6 py-4 font-bold transition-colors"
          >
            Gestionar Publicaciones Activas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-none border border-gray-100">
      {" "}
      <div className="mb-8 border-b border-gray-100 pb-6">
        {" "}
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Publicar Vehículo
        </h1>{" "}
        <p className="mt-2 text-gray-600">
          Completa los datos técnicos y de venta del vehículo.
        </p>{" "}
        
        {/* Banner de monetización para particulares */}
        {isParticular && totalVehiclesCount > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-none">
            Atención: Ya has utilizado tu publicación gratuita. Esta publicación costará $1.00 USD (cobrados a la tasa oficial del BCV del día de facturación más su respectivo IVA).
          </div>
        )}
      </div>{" "}
      <form
        onSubmit={handleSubmit((data: any) => {
          if (isParticular && (!data.estado_ubicacion || !data.ciudad_ubicacion)) {
            toast.error("Por favor ingresa tu Estado y Ciudad de ubicación");
            return;
          }
          mutation.mutate(data);
        })}
        className="space-y-8"
        autoComplete="off"
      >
        {" "}
        {/* Sección Técnica */}{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label>Marca</Label>{" "}
            <Input
              placeholder="Ej: Toyota"
              className="uppercase"
              {...register("marca")}
              disabled={mutation.isPending}
            />{" "}
            {errors.marca && (
              <p className="text-xs text-red-600">{errors.marca.message}</p>
            )}{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Modelo</Label>{" "}
            <Input
              placeholder="Ej: Corolla"
              className="uppercase"
              {...register("modelo")}
              disabled={mutation.isPending}
            />{" "}
            {errors.modelo && (
              <p className="text-xs text-red-600">{errors.modelo.message}</p>
            )}{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Versión</Label>{" "}
            <Input
              placeholder="Ej: XLS, Full Equipo"
              {...register("version")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Año</Label>{" "}
            <Input
              type="number"
              {...register("anio")}
              disabled={mutation.isPending}
            />{" "}
            {errors.anio && (
              <p className="text-xs text-red-600">{errors.anio.message}</p>
            )}{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Tipo Vehículo</Label>{" "}
            <Select
              {...register("tipo_vehiculo")}
              disabled={mutation.isPending}
            >
              {" "}
              <option value="SEDAN">Sedán</option>{" "}
              <option value="SUV">SUV</option>{" "}
              <option value="PICKUP">Pick-up</option>{" "}
              <option value="CARGA">Carga</option>{" "}
              <option value="MINIVAN">Minivan</option>{" "}
              <option value="MOTO">Motocicleta</option>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Color</Label>{" "}
            <Input
              placeholder="Ej: Plata"
              {...register("color")}
              disabled={mutation.isPending}
            />{" "}
            {errors.color && (
              <p className="text-xs text-red-600">{errors.color.message}</p>
            )}{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Motor</Label>{" "}
            <Input
              placeholder="Ej: 2.0L Turbo, V6"
              {...register("motor")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Tracción</Label>{" "}
            <Input
              placeholder="Ej: 4x4, FWD"
              {...register("traccion")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Kilometraje</Label>{" "}
            <Input
              type="number"
              {...register("kilometraje")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Transmisión</Label>{" "}
            <Select {...register("transmision")} disabled={mutation.isPending}>
              {" "}
              <option value="AUTOMATICO">Automático</option>{" "}
              <option value="SINCRONICO">Sincrónico</option>{" "}
              <option value="DUAL">Dual</option>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Combustible</Label>{" "}
            <Select {...register("combustible")} disabled={mutation.isPending}>
              {" "}
              <option value="GASOLINA">Gasolina</option>{" "}
              <option value="DIESEL">Diesel</option>{" "}
              <option value="GAS">Gas</option>{" "}
              <option value="ELECTRICO">Eléctrico</option>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Cant. Puertas</Label>{" "}
            <Input
              type="number"
              placeholder="4"
              {...register("cantidad_puertas")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Cantidad de Ejes</Label>{" "}
            <Input
              type="number"
              placeholder="Ej: 2"
              {...register("cantidad_ejes")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Sección Legal */}{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label>Cant. Dueños</Label>{" "}
            <Input
              type="number"
              defaultValue="1"
              {...register("cantidad_duenos")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Serial de Motor</Label>{" "}
            <Input
              {...register("serial_motor")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Serial de Carrocería</Label>{" "}
            <Input
              {...register("serial_carroceria")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label>Placas</Label>{" "}
            <Input {...register("placas")} disabled={mutation.isPending} />{" "}
          </div>{" "}
          <div className="space-y-2 flex items-center h-full pt-6">
            {" "}
            <Label className="flex items-center space-x-2 cursor-pointer">
              {" "}
              <input
                type="checkbox"
                className="rounded-none border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                {...register("papeles_al_dia")}
                disabled={mutation.isPending}
              />{" "}
              <span>¿Papeles al día?</span>{" "}
            </Label>{" "}
          </div>{" "}
        </div>{" "}
        {/* Sección Comercial */}{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label>Precio (String exacto)</Label>{" "}
            <Input
              placeholder="15000.00"
              {...register("precio")}
              disabled={mutation.isPending}
            />{" "}
            {errors.precio && (
              <p className="text-xs text-red-600">{errors.precio.message}</p>
            )}{" "}
          </div>{" "}
          <div className="space-y-2 flex items-center h-full pt-6">
            {" "}
            <Label className="flex items-center space-x-2 cursor-pointer">
              {" "}
              <input
                type="checkbox"
                className="rounded-none border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                {...register("negociable")}
                disabled={mutation.isPending}
              />{" "}
              <span>¿Precio negociable?</span>{" "}
            </Label>{" "}
          </div>{" "}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            {" "}
            <Label>Observación adicional</Label>{" "}
            <Input
              placeholder="Ej: Tapicería nueva, aire acondicionado..."
              {...register("observacion")}
              disabled={mutation.isPending}
            />{" "}
          </div>{" "}
        </div>{" "}

        {/* Sección Ubicación (Solo Particulares) */}
        {isParticular && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <Label>Estado <span className="text-red-500">*</span></Label>
              <Select
                {...register("estado_ubicacion")}
                disabled={mutation.isPending}
              >
                <option value="">SELECCIONE UN ESTADO</option>
                <option value="AMAZONAS">AMAZONAS</option>
                <option value="ANZOÁTEGUI">ANZOÁTEGUI</option>
                <option value="APURE">APURE</option>
                <option value="ARAGUA">ARAGUA</option>
                <option value="BARINAS">BARINAS</option>
                <option value="BOLÍVAR">BOLÍVAR</option>
                <option value="CARABOBO">CARABOBO</option>
                <option value="COJEDES">COJEDES</option>
                <option value="DELTA AMACURO">DELTA AMACURO</option>
                <option value="DISTRITO CAPITAL">DISTRITO CAPITAL</option>
                <option value="FALCÓN">FALCÓN</option>
                <option value="GUÁRICO">GUÁRICO</option>
                <option value="LA GUAIRA">LA GUAIRA</option>
                <option value="LARA">LARA</option>
                <option value="MÉRIDA">MÉRIDA</option>
                <option value="MIRANDA">MIRANDA</option>
                <option value="MONAGAS">MONAGAS</option>
                <option value="NUEVA ESPARTA">NUEVA ESPARTA</option>
                <option value="PORTUGUESA">PORTUGUESA</option>
                <option value="SUCRE">SUCRE</option>
                <option value="TÁCHIRA">TÁCHIRA</option>
                <option value="TRUJILLO">TRUJILLO</option>
                <option value="YARACUY">YARACUY</option>
                <option value="ZULIA">ZULIA</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ciudad <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ej: Valencia"
                className="uppercase"
                {...register("ciudad_ubicacion")}
                disabled={mutation.isPending}
              />
              {errors.ciudad_ubicacion && (
                <p className="text-xs text-red-600">{errors.ciudad_ubicacion.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Sección Galería */}{" "}
        <div className="grid grid-cols-1 pt-4 border-t border-gray-100">
          {" "}
          <div className="mb-4">
            {" "}
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Galería Fotográfica
            </h3>{" "}
            <p className="text-sm text-gray-500">
              Sube hasta 4 fotos de tu vehículo. La primera imagen será la
              portada del anuncio.
            </p>{" "}
            {errors.imagenes_url && (
              <p className="text-sm font-medium text-red-600 mt-1">
                {errors.imagenes_url.message}
              </p>
            )}{" "}
          </div>{" "}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {" "}
            {[0, 1, 2, 3].map((index) => (
              <ImageUpload
                key={index}
                bucket="inventario"
                folderPath="vehiculos"
                defaultImage={imagenesUrl[index] || ""}
                onUploadSuccess={(url) => {
                  const newImages = [...imagenesUrl];
                  if (url) {
                    newImages[index] = url;
                  } else {
                    /* Si la url está vacía significa que se eliminó */ newImages.splice(
                      index,
                      1,
                    );
                  }
                  /* Filtrar elementos undefined/vacíos en caso de huecos */ setValue(
                    "imagenes_url",
                    newImages.filter(Boolean),
                    { shouldValidate: true },
                  );
                }}
              />
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
          {" "}
          <Button
            type="button"
            onClick={() => router.back()}
            disabled={mutation.isPending}
            className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 px-6"
          >
            {" "}
            Cancelar{" "}
          </Button>{" "}
          <Button
            type="submit"
            className="px-10 h-10 text-sm "
            disabled={mutation.isPending}
          >
            {" "}
            {mutation.isPending ? "Publicando..." : "Publicar Vehículo"}{" "}
          </Button>{" "}
        </div>{" "}
      </form>{" "}
    </div>
  );
}
