import { IconBaseProps } from "react-icons";
import {
  FaWrench,
  FaGaugeHigh,
  FaGasPump,
  FaKey,
  FaTags,
  FaStore,
  FaLocationDot,
  FaHandshake,
  FaFileContract
} from "react-icons/fa6";
import { 
  PiCarProfileFill, 
  PiMotorcycleFill, 
  PiTruckFill, 
  PiGearSixFill 
} from "react-icons/pi";
import { MdVerified } from "react-icons/md";

/**
 * Icons.tsx
 * Sistema centralizado de iconos semánticos para el E-Commerce automotriz.
 * 
 * Utiliza react-icons (FontAwesome 6 y Material Design) para un look más sólido y mecánico.
 */
export const Icons = {
  Vehiculo: (props: IconBaseProps) => <PiCarProfileFill {...props} />,
  Moto: (props: IconBaseProps) => <PiMotorcycleFill {...props} />,
  Camioneta: (props: IconBaseProps) => <PiTruckFill {...props} />,
  Herramienta: (props: IconBaseProps) => <FaWrench {...props} />,
  Repuesto: (props: IconBaseProps) => <PiGearSixFill {...props} />,
  Kilometraje: (props: IconBaseProps) => <FaGaugeHigh {...props} />,
  Combustible: (props: IconBaseProps) => <FaGasPump {...props} />,
  Propietario: (props: IconBaseProps) => <FaKey {...props} />,
  Garantia: (props: IconBaseProps) => <MdVerified {...props} />,
  Precio: (props: IconBaseProps) => <FaTags {...props} />,
  Concesionario: (props: IconBaseProps) => <FaStore {...props} />,
  Ubicacion: (props: IconBaseProps) => <FaLocationDot {...props} />,
  Trato: (props: IconBaseProps) => <FaHandshake {...props} />,
  Documento: (props: IconBaseProps) => <FaFileContract {...props} />,
};

export type IconType = keyof typeof Icons;
