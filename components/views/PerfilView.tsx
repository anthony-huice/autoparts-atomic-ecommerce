import React from 'react';
import { BadgeCheck, User, Mail, Phone, MapPin, Calendar, Globe } from 'lucide-react';

interface PerfilViewProps {
  persona: {
    nombres: string;
    apellidos: string;
    nacionalidad: string;
    cedula_pasaporte: string;
    correo: string;
    telefonos: string[];
    direccion_residencia: string;
    fecha_nacimiento: string;
    redes_sociales?: string[];
    estado_verificacion?: string | null;
    foto_cedula_url?: string | null;
  };
}

export function PerfilView({ persona }: PerfilViewProps) {
  let badgeProps = {
    colorClass: "bg-gray-50 text-gray-700 border-gray-200",
    text: "No Verificado",
    icon: <User className="w-4 h-4" />
  };

  if (persona.estado_verificacion === 'APROBADO') {
    badgeProps = {
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      text: "Cuenta Verificada",
      icon: <BadgeCheck className="w-4 h-4" />
    };
  } else if (persona.estado_verificacion === 'PENDIENTE' || persona.foto_cedula_url) {
    badgeProps = {
      colorClass: "bg-amber-50 text-amber-700 border-amber-200",
      text: "En Revisión",
      icon: <BadgeCheck className="w-4 h-4" />
    };
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-none border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-gray-100 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Perfil de Usuario
          </h1>
          <p className="mt-2 text-gray-600">
            Tus datos personales registrados en la plataforma.
          </p>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border text-sm font-medium whitespace-nowrap self-start sm:self-auto ${badgeProps.colorClass}`}>
          {badgeProps.icon}
          {badgeProps.text}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre Completo</p>
          </div>
          <p className="text-base font-medium text-gray-900">
            {persona.nombres} {persona.apellidos}
          </p>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento de Identidad</p>
          </div>
          <p className="text-base font-medium text-gray-900">
            {persona.nacionalidad}-{persona.cedula_pasaporte}
          </p>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo Electrónico</p>
          </div>
          <p className="text-base font-medium text-gray-900">
            {persona.correo}
          </p>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfonos</p>
          </div>
          <div className="text-base font-medium text-gray-900">
            {persona.telefonos && persona.telefonos.length > 0 ? (
              persona.telefonos.map((tel, i) => (
                <div key={i}>{tel}</div>
              ))
            ) : (
              <span className="text-gray-400">No especificado</span>
            )}
          </div>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dirección de Residencia</p>
          </div>
          <p className="text-base font-medium text-gray-900">
            {persona.direccion_residencia}
          </p>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha de Nacimiento</p>
          </div>
          <p className="text-base font-medium text-gray-900">
            {new Date(persona.fecha_nacimiento).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="p-5 bg-gray-50 rounded-none border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Redes Sociales</p>
          </div>
          <div className="text-base font-medium text-gray-900">
            {persona.redes_sociales && persona.redes_sociales.length > 0 ? (
              persona.redes_sociales.map((red, i) => (
                <div key={i} className="truncate">{red}</div>
              ))
            ) : (
              <span className="text-gray-400">No especificadas</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
