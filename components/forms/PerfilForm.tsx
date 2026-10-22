'use client';
import { useRouter } from 'next/navigation'
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

const personaSchema = z.object({
  nombres: z.string().min(2, 'Los nombres son obligatorios'), apellidos: z.string().min(2, 'Los apellidos son obligatorios'), nacionalidad: z.enum(['V', 'E', 'P']), cedula_pasaporte: z.string().min(5, 'Documento inválido'), fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'), telefono_1: z.string().min(10, 'Teléfono primario inválido'), telefono_2: z.string().optional(), redes_sociales: z.string().optional(), direccion_residencia: z.string().min(5, 'La dirección es obligatoria'), foto_cedula_url: z.string().min(1, 'Debe subir una foto de su documento de identidad'),
});

type PersonaFormValues = z.infer<typeof personaSchema>;

export function PerfilForm() {
    const router = useRouter();
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { data: user } = useSession();
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PersonaFormValues>({
        resolver: zodResolver(personaSchema),
        defaultValues: { nacionalidad: 'V' }
    });
    const foto_cedula_url = watch('foto_cedula_url');

    /* Mutación de TanStack Query */
    const mutation = useMutation({
        mutationFn: async (data: PersonaFormValues) => {
            if (!user) throw new Error("No hay usuario autenticado");
            const telefonos = [data.telefono_1, data.telefono_2].filter(Boolean) as string[];
            const redes = data.redes_sociales ? data.redes_sociales.split(',').map(s => s.trim()).filter(Boolean) : [];
            const { data: result, error } = await supabase.from('personas').insert({
                auth_user_id: user.id,
                nombres: data.nombres,
                apellidos: data.apellidos,
                nacionalidad: data.nacionalidad,
                cedula_pasaporte: data.cedula_pasaporte,
                fecha_nacimiento: data.fecha_nacimiento,
                correo: user.email || "",
                telefonos: telefonos,
                redes_sociales: redes,
                direccion_residencia: data.direccion_residencia,
                foto_cedula_url: data.foto_cedula_url,
                estado_verificacion: data.foto_cedula_url ? 'PENDIENTE' : null,
            }).select().single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            toast.success('Perfil personal guardado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['persona'] });
            /* Refrescar la ruta para invalidar caché del Layout y desbloquear el menú */
            router.refresh();
            /* Redirigir al Centro de Mando para que el usuario elija su siguiente acción */
            router.push('/panel-aliado');
        },
        onError: (error: any) => {
            /* Manejo básico de errores por llave única (ej. cédula duplicada) */
            if (error.code === '23505') {
                toast.error('Este documento de identidad o correo ya está registrado.');
            } else {
                toast.error(error.message || 'Ocurrió un error al guardar el perfil');
            }
        }
    });

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-none border border-gray-100">
            <div className="mb-8 border-b border-gray-100 pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Paso 1: Información del Anunciante</h1>
                <p className="mt-2 text-gray-600"> Por razones de seguridad y transparencia, debes completar tu perfil personal con información verificable antes de publicar cualquier vehículo o repuesto en la plataforma. </p>
            </div>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombres */}
                    <div className="space-y-2">
                        <Label htmlFor="nombres">Nombres</Label>
                        <Input id="nombres" placeholder="Ej: Juan Carlos" {...register('nombres')} disabled={mutation.isPending} />
                        {errors.nombres && <p className="text-xs font-medium text-red-600">{errors.nombres.message}</p>}
                    </div>
                    {/* Apellidos */}
                    <div className="space-y-2">
                        <Label htmlFor="apellidos">Apellidos</Label>
                        <Input id="apellidos" placeholder="Ej: Pérez Gómez" {...register('apellidos')} disabled={mutation.isPending} />
                        {errors.apellidos && <p className="text-xs font-medium text-red-600">{errors.apellidos.message}</p>}
                    </div>
                    {/* Cédula y Nacionalidad */}
                    <div className="space-y-2">
                        <Label htmlFor="cedula">Nacionalidad y Documento</Label>
                        <div className="flex gap-2">
                            <Select className="w-24" {...register('nacionalidad')} disabled={mutation.isPending}>
                                <option value="V">V</option>
                                <option value="E">E</option>
                                <option value="P">P</option>
                            </Select>
                            <Input id="cedula" placeholder="12345678" className="flex-1" {...register('cedula_pasaporte')} disabled={mutation.isPending} />
                        </div>
                        {errors.cedula_pasaporte && <p className="text-xs font-medium text-red-600">{errors.cedula_pasaporte.message}</p>}
                    </div>
                    {/* Fecha de Nacimiento */}
                    <div className="space-y-2">
                        <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                        <Input id="fecha_nacimiento" type="date" {...register('fecha_nacimiento')} disabled={mutation.isPending} />
                        {errors.fecha_nacimiento && <p className="text-xs font-medium text-red-600">{errors.fecha_nacimiento.message}</p>}
                    </div>
                    {/* Teléfonos */}
                    <div className="space-y-2">
                        <Label htmlFor="telefono_1">Teléfono Principal</Label>
                        <Input id="telefono_1" type="tel" placeholder="0414-1234567" {...register('telefono_1')} disabled={mutation.isPending} />
                        {errors.telefono_1 && <p className="text-xs font-medium text-red-600">{errors.telefono_1.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telefono_2">Teléfono Secundario (Opcional)</Label>
                        <Input id="telefono_2" type="tel" placeholder="0412-1234567" {...register('telefono_2')} disabled={mutation.isPending} />
                        {errors.telefono_2 && <p className="text-xs font-medium text-red-600">{errors.telefono_2.message}</p>}
                    </div>
                    {/* Redes Sociales */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="redes_sociales">Redes Sociales (Opcional)</Label>
                        <Input id="redes_sociales" placeholder="Ej: @tu_usuario, https://instagram.com/tu_usuario" {...register('redes_sociales')} disabled={mutation.isPending} />
                        <p className="text-xs text-gray-500">Puedes separar múltiples redes con comas.</p>
                    </div>
                    {/* Dirección */}
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="direccion">Dirección de Residencia Completa</Label>
                        <Input id="direccion" placeholder="Ej: Av. Principal, Edificio X, Apto Y, Caracas..." {...register('direccion_residencia')} disabled={mutation.isPending} />
                        {errors.direccion_residencia && <p className="text-xs font-medium text-red-600">{errors.direccion_residencia.message}</p>}
                    </div>
                    {/* Foto Cédula */}
                    <div className="space-y-2 md:col-span-2 pt-4 border-t border-gray-100">
                        <Label className="text-base font-semibold">Foto de Cédula o Pasaporte <span className="text-red-600">*</span></Label>
                        <p className="text-xs text-gray-500 mb-4"> Es estrictamente obligatorio subir una foto de tu documento. Este archivo se almacena de forma <span className="font-bold">encriptada y privada</span> y nadie más podrá verlo. </p>
                        <ImageUpload bucket="documentos_privados" folderPath="cedulas" onUploadSuccess={(url) => setValue('foto_cedula_url', url, { shouldValidate: true })} />
                        {foto_cedula_url && (<p className="text-sm font-medium text-emerald-600 mt-2">✓ Documento cargado correctamente.</p>)}
                        {errors.foto_cedula_url && <p className="text-xs font-medium text-red-600 mt-2">{errors.foto_cedula_url.message}</p>}
                    </div>
                </div>
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <Button type="submit" className="w-full md:w-auto px-10 h-12 text-base " disabled={mutation.isPending}>
                        {mutation.isPending ? 'Guardando Perfil...' : 'Completar Perfil y Continuar'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
