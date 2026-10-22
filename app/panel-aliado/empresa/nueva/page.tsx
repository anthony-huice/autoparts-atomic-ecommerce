'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { ImageUpload } from '@/components/ui/image-upload'
const ESTADOS_CIUDADES: Record<string, string[]> = {
    "AMAZONAS": ["PUERTO AYACUCHO", "SAN FERNANDO DE ATABAPO"],
    "ANZOÁTEGUI": ["BARCELONA", "PUERTO LA CRUZ", "LECHERÍA", "EL TIGRE", "ANACO", "CANTAURA"],
    "APURE": ["SAN FERNANDO DE APURE", "ACHAGUAS", "GUASDUALITO"],
    "ARAGUA": ["MARACAY", "TURMERO", "LA VICTORIA", "CAGUA", "VILLA DE CURA"],
    "BARINAS": ["BARINAS", "SOCOPÓ", "SANTA BÁRBARA"],
    "BOLÍVAR": ["CIUDAD BOLÍVAR", "PUERTO ORDAZ", "SAN FÉLIX", "UPATA", "GUASIPATI"],
    "CARABOBO": ["VALENCIA", "PUERTO CABELLO", "GUACARA", "MARIACARA", "BEJUMA"],
    "COJEDES": ["SAN CARLOS", "TINAQUILLO"],
    "DELTA AMACURO": ["TUCUPITA"],
    "DISTRITO CAPITAL": ["CARACAS"],
    "FALCÓN": ["CORO", "PUNTO FIJO", "CHURUGUARA"],
    "GUÁRICO": ["SAN JUAN DE LOS MORROS", "VALLE DE LA PASCUA", "CALABOZO", "ZARAZA"],
    "LARA": ["BARQUISIMETO", "CARORA", "CABUDARE", "EL TOCUYO"],
    "MÉRIDA": ["MÉRIDA", "EL VIGÍA", "TOVAR", "EJIDO"],
    "MIRANDA": ["LOS TEQUES", "GUARENAS", "GUATIRE", "CHARALLAVE", "CÚA", "SAN ANTONIO DE LOS ALTOS"],
    "MONAGAS": ["MATURÍN", "CARIPE", "PUNTA DE MATA"],
    "NUEVA ESPARTA": ["LA ASUNCIÓN", "PORLAMAR", "PAMPATAR", "JUANGRIEGO"],
    "PORTUGUESA": ["GUANARE", "ACARIGUA", "ARAURE"],
    "SUCRE": ["CUMANÁ", "CARÚPANO", "GÜIRIA"],
    "TÁCHIRA": ["SAN CRISTÓBAL", "TÁRIBA", "RUBIO", "LA GRITA", "SAN ANTONIO DEL TÁCHIRA"],
    "TRUJILLO": ["TRUJILLO", "VALERA", "BOCONÓ"],
    "LA GUAIRA": ["LA GUAIRA", "MAIQUETÍA", "CATIA LA MAR", "CARABALLEDA"],
    "YARACUY": ["SAN FELIPE", "CHIVACOA", "YARITAGUA"],
    "ZULIA": ["MARACAIBO", "SAN FRANCISCO", "CABIMAS", "CIUDAD OJEDA", "MACHIQUES"]
};

const empresaSchema = z.object({
    tipo_empresa: z.enum(['ALIADO_COMERCIAL', 'CONCESIONARIO']),
    tipo_plan: z.enum(['DESTACADO', 'PREMIUM', 'BRONCE', 'PLATA', 'ORO']).optional(),
    razon_social: z.string().min(3, 'La razón social es obligatoria'),
    nombre_comercial: z.string().min(2, 'El nombre comercial es obligatorio'),
    rif: z.string().min(5, 'RIF inválido'),
    correo: z.string().email('Correo inválido'),
    telefono: z.string().min(10, 'Teléfono inválido'),
    direccion: z.string().min(5, 'La dirección es obligatoria'),
    pagina_web: z.string().min(5, 'La URL de página o red social es obligatoria').url('URL inválida (usa https://...)'),
    foto_establecimiento_url: z.string().min(5, 'La foto del establecimiento es obligatoria'),
    estado: z.string().min(2, 'El estado es obligatorio'),
    ciudad: z.string().min(2, 'La ciudad es obligatoria'),
    nombre_registro: z.string().min(2, 'El nombre del registro es obligatorio'),
    circunscripcion: z.string().min(2, 'La circunscripción es obligatoria'),
    tomo: z.string().min(1, 'El tomo es obligatorio'),
    folio: z.string().min(1, 'El folio es obligatorio'),
    nro_expediente: z.string().min(1, 'El número de expediente es obligatorio'),
    fecha_registro: z.string().min(1, 'La fecha de registro es obligatoria'),
}).refine((data) => {
    return !!data.tipo_plan;
}, {
    message: "Debe seleccionar un plan comercial",
    path: ["tipo_plan"]
});

type EmpresaFormValues = z.infer<typeof empresaSchema>
export default function NuevaEmpresaPage() {
    const router = useRouter();
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { data: user } = useSession();
    
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EmpresaFormValues>({
        resolver: zodResolver(empresaSchema),
        defaultValues: { tipo_empresa: 'ALIADO_COMERCIAL' }
    });

    const tipoEmpresaWatcher = watch('tipo_empresa');
    const tipoPlanWatcher = watch('tipo_plan');
    const estadoWatcher = watch('estado');

    const [hasConcesionario, setHasConcesionario] = useState(false);
    const [hasAliado, setHasAliado] = useState(false);
    const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(true);

    useEffect(() => {
        async function fetchEmpresas() {
            if (!user) return;
            setIsLoadingEmpresas(true);
            const { data: persona } = await supabase
                .from('personas')
                .select('id')
                .eq('auth_user_id', user.id)
                .single();
            
            if (persona) {
                const { data: empleados } = await supabase
                    .from('empleados_empresa')
                    .select('empresa_id, empresas(tipo_empresa, deleted_at)')
                    .eq('persona_id', persona.id);

                if (empleados) {
                    const activeTypes = empleados
                        .map((e: any) => e.empresas)
                        .filter((emp: any) => emp && emp.deleted_at === null)
                        .map((emp: any) => emp.tipo_empresa);
                    
                    const concesionario = activeTypes.includes('CONCESIONARIO');
                    const aliado = activeTypes.includes('ALIADO_COMERCIAL');

                    setHasConcesionario(concesionario);
                    setHasAliado(aliado);
                    
                    if (!concesionario && aliado) {
                        setValue('tipo_empresa', 'CONCESIONARIO');
                    } else if (concesionario && !aliado) {
                        setValue('tipo_empresa', 'ALIADO_COMERCIAL');
                    }
                }
            }
            setIsLoadingEmpresas(false);
        }
        fetchEmpresas();
    }, [user, supabase, setValue]);

    const mutation = useMutation({
        mutationFn: async (data: EmpresaFormValues) => {
            if (!user) throw new Error("No hay usuario autenticado");
            
            // 1. Obtener el persona_id del usuario actual
            const { data: personaData, error: personaError } = await supabase
                .from('personas')
                .select('id')
                .eq('auth_user_id', user.id)
                .single();
                
            if (personaError || !personaData) {
                throw new Error("No se encontró tu perfil personal. Por favor completa el Paso 0 en 'Mi Perfil' primero.");
            }
            
            // 2. Invocar el RPC transaccional
            const p_empresa_data = {
                tipo_empresa: data.tipo_empresa,
                razon_social: data.razon_social,
                nombre_comercial: data.nombre_comercial,
                rif: data.rif,
                direccion: data.direccion,
                telefonos: [data.telefono], // La BD espera un arreglo
                correo: data.correo,
                pagina_web: data.pagina_web,
                foto_establecimiento_url: data.foto_establecimiento_url,
                ubicacion: { estado: data.estado, ciudad: data.ciudad },
                documentos_legales: {
                    nombre_registro: data.nombre_registro,
                    circunscripcion: data.circunscripcion,
                    tomo: data.tomo,
                    folio: data.folio,
                    nro_expediente: data.nro_expediente,
                    fecha_registro: data.fecha_registro
                }
            };
            
            const { data: empresaId, error: rpcError } = await supabase.rpc('crear_empresa_con_representante', {
                p_empresa_data: p_empresa_data,
                p_persona_id: personaData.id
            });
            
            if (rpcError) throw rpcError;

            // 3. Insertar el plan de suscripción
            if (data.tipo_plan) {
                let precio = 0;
                let dias = 30;

                if (data.tipo_plan === 'DESTACADO') { precio = 20; dias = 45; }
                else if (data.tipo_plan === 'PREMIUM') { precio = 50; dias = 60; }
                else if (data.tipo_plan === 'BRONCE') { precio = 5; dias = 30; }
                else if (data.tipo_plan === 'PLATA') { precio = 15; dias = 60; }
                else if (data.tipo_plan === 'ORO') { precio = 30; dias = 90; }

                const fechaFin = new Date();
                fechaFin.setDate(fechaFin.getDate() + dias);
                
                const { error: upsertError } = await supabase
                    .from('empresa_suscripciones')
                    .upsert({
                        empresa_id: empresaId,
                        tipo_plan: data.tipo_plan,
                        precio_pagado_usd: precio,
                        fecha_fin: fechaFin.toISOString(),
                    }, { onConflict: 'empresa_id' });
                    
                if (upsertError) {
                    throw new Error("Empresa creada pero falló la asignación del plan: " + upsertError.message);
                }
            }

            return empresaId;
        },
        onSuccess: () => {
            toast.success('Empresa registrada exitosamente');
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
            router.push('/panel-aliado/planes');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Error al registrar la empresa');
        }
    });

    if (isLoadingEmpresas) {
        return <div className="p-8 text-center text-gray-500">Cargando...</div>;
    }

    if (hasConcesionario && hasAliado) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto bg-white border border-gray-100 rounded-none">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Límite de empresas alcanzado</h3>
                <p className="text-gray-600 mb-8 max-w-md">
                    Ya has registrado el máximo de empresas permitidas para tu cuenta (1 Concesionario y 1 Aliado Comercial). No puedes registrar más sucursales por el momento.
                </p>
                <Link 
                    href="/panel-aliado" 
                    className="inline-flex items-center justify-center bg-[#1e40af] hover:bg-blue-900 text-white rounded-none px-8 py-3 font-medium transition-colors"
                >
                    Volver a mi panel
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-none border border-gray-100">
            <div className="mb-8 border-b border-gray-100 pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Registrar Nueva Empresa</h1>
                <p className="mt-2 text-gray-600"> Agrega la información de tu concesionario o tienda física. Serás registrado automáticamente como el Representante Legal en el sistema. </p>
            </div>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo Empresa */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="tipo_empresa">Tipo de Empresa</Label>
                        <Select id="tipo_empresa" {...register('tipo_empresa')} disabled={mutation.isPending}>
                            {!hasAliado && <option value="ALIADO_COMERCIAL">Aliado Comercial (Tienda de Repuestos / Taller)</option>}
                            {!hasConcesionario && <option value="CONCESIONARIO">Concesionario de Vehículos</option>}
                        </Select>
                        {errors.tipo_empresa && <p className="text-xs text-red-600">{errors.tipo_empresa.message}</p>}
                    </div>

                    {/* Selector de Planes para Concesionario */}
                    {tipoEmpresaWatcher === 'CONCESIONARIO' && (
                        <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Selecciona tu Plan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Label className={`border p-6 cursor-pointer hover:bg-gray-50 flex flex-col items-center text-center transition-colors rounded-none ${tipoPlanWatcher === 'DESTACADO' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'}`}>
                                    <input type="radio" value="DESTACADO" className="hidden" {...register('tipo_plan')} disabled={mutation.isPending} />
                                    <h4 className="text-xl font-bold uppercase text-gray-900">Plan Destacado</h4>
                                    <p className="text-lg font-bold text-blue-600 mt-2">$20<span className="text-sm font-normal text-gray-500"> + IVA</span></p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">45 días</p>
                                    <p className="text-sm text-gray-500 mt-3 font-medium">"El equilibrio perfecto entre rapidez y precio"</p>
                                    <ul className="text-xs text-left text-gray-600 mt-4 space-y-2 w-full">
                                        <li>✓ Hasta 10 vehículos</li>
                                        <li>✓ 6 fotos por vehículo</li>
                                        <li>✓ Primeras posiciones de búsqueda</li>
                                        <li>✓ Etiqueta "Destacado"</li>
                                        <li>✓ Soporte técnico prioritario</li>
                                    </ul>
                                </Label>
                                <Label className={`border-2 p-6 cursor-pointer hover:bg-gray-50 flex flex-col items-center text-center transition-colors rounded-none ${tipoPlanWatcher === 'PREMIUM' ? 'border-blue-800 bg-blue-50 shadow-md' : 'border-gray-200'}`}>
                                    <input type="radio" value="PREMIUM" className="hidden" {...register('tipo_plan')} disabled={mutation.isPending} />
                                    <h4 className="text-xl font-bold uppercase text-gray-900">Plan Premium</h4>
                                    <p className="text-lg font-bold text-blue-800 mt-2">$50<span className="text-sm font-normal text-gray-500"> + IVA</span></p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">60 días</p>
                                    <p className="text-sm text-gray-500 mt-3 font-medium">"Vende tu vehículo a la velocidad de la luz"</p>
                                    <ul className="text-xs text-left text-gray-600 mt-4 space-y-2 w-full">
                                        <li>✓ Hasta 30 vehículos</li>
                                        <li>✓ 12 fotos por vehículo</li>
                                        <li>✓ Banner principal</li>
                                        <li>✓ Notificación Push</li>
                                        <li>✓ Sello "Vendedor Confiable"</li>
                                        <li>✓ Estadísticas de visualización</li>
                                    </ul>
                                </Label>
                            </div>
                            {errors.tipo_plan && <p className="text-xs font-bold text-red-600">{errors.tipo_plan.message}</p>}
                        </div>
                    )}

                    {/* Selector de Planes para Aliado Comercial */}
                    {tipoEmpresaWatcher === 'ALIADO_COMERCIAL' && (
                        <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Selecciona tu Plan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Label className={`border p-6 cursor-pointer hover:bg-gray-50 flex flex-col items-center text-center transition-colors rounded-none ${tipoPlanWatcher === 'BRONCE' ? 'border-orange-600 bg-orange-50/50' : 'border-gray-200'}`}>
                                    <input type="radio" value="BRONCE" className="hidden" {...register('tipo_plan')} disabled={mutation.isPending} />
                                    <h4 className="text-xl font-bold uppercase text-gray-900">Plan Bronce</h4>
                                    <p className="text-lg font-bold text-orange-600 mt-2">$5<span className="text-sm font-normal text-gray-500"> /mes</span></p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">30 días</p>
                                    <ul className="text-xs text-left text-gray-600 mt-4 space-y-2 w-full">
                                        <li>✓ Hasta 20 repuestos activos</li>
                                    </ul>
                                </Label>
                                <Label className={`border-2 p-6 cursor-pointer hover:bg-gray-50 flex flex-col items-center text-center transition-colors rounded-none ${tipoPlanWatcher === 'PLATA' ? 'border-slate-400 bg-slate-50 shadow-md' : 'border-gray-200'}`}>
                                    <input type="radio" value="PLATA" className="hidden" {...register('tipo_plan')} disabled={mutation.isPending} />
                                    <h4 className="text-xl font-bold uppercase text-gray-900">Plan Plata</h4>
                                    <p className="text-lg font-bold text-slate-500 mt-2">$15<span className="text-sm font-normal text-gray-500"> /2 meses</span></p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">60 días</p>
                                    <ul className="text-xs text-left text-gray-600 mt-4 space-y-2 w-full">
                                        <li>✓ Hasta 50 repuestos activos</li>
                                        <li>✓ Botón directo a WhatsApp</li>
                                    </ul>
                                </Label>
                                <Label className={`border-2 p-6 cursor-pointer hover:bg-gray-50 flex flex-col items-center text-center transition-colors rounded-none ${tipoPlanWatcher === 'ORO' ? 'border-yellow-600 bg-yellow-50 shadow-md' : 'border-gray-200'}`}>
                                    <input type="radio" value="ORO" className="hidden" {...register('tipo_plan')} disabled={mutation.isPending} />
                                    <h4 className="text-xl font-bold uppercase text-gray-900">Plan Oro</h4>
                                    <p className="text-lg font-bold text-yellow-600 mt-2">$30<span className="text-sm font-normal text-gray-500"> /3 meses</span></p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">90 días</p>
                                    <ul className="text-xs text-left text-gray-600 mt-4 space-y-2 w-full">
                                        <li>✓ Repuestos ilimitados</li>
                                        <li>✓ Botón directo a WhatsApp</li>
                                        <li>✓ Destacados automáticos semanales</li>
                                    </ul>
                                </Label>
                            </div>
                            {errors.tipo_plan && <p className="text-xs font-bold text-red-600">{errors.tipo_plan.message}</p>}
                        </div>
                    )}
                    {/* Razón Social */}
                    <div className="space-y-2">
                        <Label htmlFor="razon_social">Razón Social</Label>
                        <Input id="razon_social" placeholder="Ej: Inversiones Automotrices C.A." {...register('razon_social')} disabled={mutation.isPending} />
                        {errors.razon_social && <p className="text-xs font-medium text-red-600">{errors.razon_social.message}</p>}
                    </div>
                    {/* Nombre Comercial */}
                    <div className="space-y-2">
                        <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
                        <Input id="nombre_comercial" placeholder="Ej: AutoPartes Express" {...register('nombre_comercial')} disabled={mutation.isPending} />
                        {errors.nombre_comercial && <p className="text-xs font-medium text-red-600">{errors.nombre_comercial.message}</p>}
                    </div>
                    {/* RIF */}
                    <div className="space-y-2">
                        <Label htmlFor="rif">RIF</Label>
                        <Input id="rif" placeholder="J-12345678-9" {...register('rif')} disabled={mutation.isPending} />
                        {errors.rif && <p className="text-xs font-medium text-red-600">{errors.rif.message}</p>}
                    </div>
                    {/* Teléfono */}
                    <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono de la Empresa</Label>
                        <Input id="telefono" type="tel" placeholder="0212-1234567" {...register('telefono')} disabled={mutation.isPending} />
                        {errors.telefono && <p className="text-xs font-medium text-red-600">{errors.telefono.message}</p>}
                    </div>
                    {/* Correo */}
                    <div className="space-y-2">
                        <Label htmlFor="correo">Correo Electrónico</Label>
                        <Input id="correo" type="email" placeholder="ventas@empresa.com" {...register('correo')} disabled={mutation.isPending} />
                        {errors.correo && <p className="text-xs font-medium text-red-600">{errors.correo.message}</p>}
                    </div>
                    {/* Página Web */}
                    <div className="space-y-2">
                        <Label htmlFor="pagina_web">Página Web o Red Social</Label>
                        <Input id="pagina_web" type="url" placeholder="https://instagram.com/tuempresa" {...register('pagina_web')} disabled={mutation.isPending} />
                        {errors.pagina_web && <p className="text-xs font-medium text-red-600">{errors.pagina_web.message}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Geolocalización</h3>
                    </div>
                    {/* Estado */}
                    <div className="space-y-2">
                        <Label htmlFor="estado">Estado</Label>
                        <Select 
                            id="estado" 
                            {...register('estado')} 
                            disabled={mutation.isPending}
                            onChange={(e) => {
                                register('estado').onChange(e);
                                setValue('ciudad', ''); // Reiniciar ciudad al cambiar estado
                            }}
                        >
                            <option value="">SELECCIONE UN ESTADO</option>
                            {Object.keys(ESTADOS_CIUDADES).map((estado) => (
                                <option key={estado} value={estado}>{estado}</option>
                            ))}
                        </Select>
                        {errors.estado && <p className="text-xs font-medium text-red-600">{errors.estado.message}</p>}
                    </div>
                    {/* Ciudad */}
                    <div className="space-y-2">
                        <Label htmlFor="ciudad">Ciudad</Label>
                        <Select 
                            id="ciudad" 
                            {...register('ciudad')} 
                            disabled={mutation.isPending || !estadoWatcher}
                        >
                            <option value="">SELECCIONE UNA CIUDAD</option>
                            {estadoWatcher && ESTADOS_CIUDADES[estadoWatcher]?.map((ciudad) => (
                                <option key={ciudad} value={ciudad}>{ciudad}</option>
                            ))}
                        </Select>
                        {errors.ciudad && <p className="text-xs font-medium text-red-600">{errors.ciudad.message}</p>}
                    </div>
                    {/* Dirección */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="direccion">Dirección Fiscal Completa</Label>
                        <Input id="direccion" placeholder="Av. Principal, Edificio, Local..." {...register('direccion')} disabled={mutation.isPending} />
                        {errors.direccion && <p className="text-xs font-medium text-red-600">{errors.direccion.message}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Datos del Registro Mercantil</h3>
                    </div>
                    {/* Nombre Registro */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nombre_registro">Nombre del Registro Mercantil</Label>
                        <Input id="nombre_registro" placeholder="Ej: Registro Mercantil Quinto del Distrito Capital" {...register('nombre_registro')} disabled={mutation.isPending} />
                        {errors.nombre_registro && <p className="text-xs font-medium text-red-600">{errors.nombre_registro.message}</p>}
                    </div>
                    {/* Circunscripción */}
                    <div className="space-y-2">
                        <Label htmlFor="circunscripcion">Circunscripción</Label>
                        <Input id="circunscripcion" placeholder="Ej: Distrito Capital y Estado Miranda" {...register('circunscripcion')} disabled={mutation.isPending} />
                        {errors.circunscripcion && <p className="text-xs font-medium text-red-600">{errors.circunscripcion.message}</p>}
                    </div>
                    {/* Tomo */}
                    <div className="space-y-2">
                        <Label htmlFor="tomo">Tomo</Label>
                        <Input id="tomo" placeholder="Ej: 12-A" {...register('tomo')} disabled={mutation.isPending} />
                        {errors.tomo && <p className="text-xs font-medium text-red-600">{errors.tomo.message}</p>}
                    </div>
                    {/* Folio */}
                    <div className="space-y-2">
                        <Label htmlFor="folio">Folio</Label>
                        <Input id="folio" placeholder="Ej: 45" {...register('folio')} disabled={mutation.isPending} />
                        {errors.folio && <p className="text-xs font-medium text-red-600">{errors.folio.message}</p>}
                    </div>
                    {/* Nro Expediente */}
                    <div className="space-y-2">
                        <Label htmlFor="nro_expediente">Nro. de Expediente</Label>
                        <Input id="nro_expediente" placeholder="Ej: 211-12345" {...register('nro_expediente')} disabled={mutation.isPending} />
                        {errors.nro_expediente && <p className="text-xs font-medium text-red-600">{errors.nro_expediente.message}</p>}
                    </div>
                    {/* Fecha de Registro */}
                    <div className="space-y-2">
                        <Label htmlFor="fecha_registro">Fecha de Registro</Label>
                        <Input id="fecha_registro" type="date" {...register('fecha_registro')} disabled={mutation.isPending} />
                        {errors.fecha_registro && <p className="text-xs font-medium text-red-600">{errors.fecha_registro.message}</p>}
                    </div>
                    {/* Foto Establecimiento */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                        <Label className="text-base font-semibold">Foto del Establecimiento</Label>
                        <p className="text-xs text-gray-500 mb-4">Sube una foto de la fachada de tu concesionario o tienda para dar más confianza a los clientes.</p>
                        <ImageUpload bucket="inventario" folderPath="empresas" onUploadSuccess={(url) => setValue('foto_establecimiento_url', url, { shouldValidate: true })} />
                        {errors.foto_establecimiento_url && <p className="text-xs font-medium text-red-600">{errors.foto_establecimiento_url.message}</p>}
                    </div>
                </div>
                <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                    <Button type="button" onClick={() => router.back()} disabled={mutation.isPending} className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 px-6" > Cancelar </Button>
                    <Button type="submit" className="px-10 h-10 text-sm " disabled={mutation.isPending}> {mutation.isPending ? 'Registrando...' : 'Registrar Empresa'} </Button>
                </div>
            </form>
        </div>
    );
}
