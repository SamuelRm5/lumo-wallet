import {
	Banknote,
	Briefcase,
	Car,
	Gift,
	GraduationCap,
	HeartPulse,
	Home,
	MoreHorizontal,
	PartyPopper,
	ShoppingBag,
	Utensils,
	Zap,
} from "lucide-react-native";

// lucide-react-native no exporta un tipo `LucideIcon` público; se deriva del
// tipo real de un ícono cualquiera del set.
type LucideIcon = typeof Utensils;

// `icon` en el contrato es un identificador semántico, no el nombre de un
// icono de una librería concreta: el mapeo lo hace la app (docs/APP_MOVIL.md
// §4.6). Esta lista cubre el catálogo sembrado de 13 categorías
// (server/src/controllers/auth.controller.js, CATALOGO_INICIAL) y sirve de
// selector cerrado al crear una categoría nueva, en vez de texto libre.
export const categoryIconOptions: { id: string; label: string; icon: LucideIcon }[] = [
	{ id: "food", label: "Comida", icon: Utensils },
	{ id: "transport", label: "Transporte", icon: Car },
	{ id: "utilities", label: "Servicios", icon: Zap },
	{ id: "health", label: "Salud", icon: HeartPulse },
	{ id: "home", label: "Hogar", icon: Home },
	{ id: "leisure", label: "Ocio", icon: PartyPopper },
	{ id: "education", label: "Educación", icon: GraduationCap },
	{ id: "salary", label: "Salario", icon: Banknote },
	{ id: "freelance", label: "Freelance", icon: Briefcase },
	{ id: "sales", label: "Ventas", icon: ShoppingBag },
	{ id: "gift", label: "Regalos", icon: Gift },
	{ id: "other", label: "Otros", icon: MoreHorizontal },
];

export function getCategoryIcon(id: string | null): LucideIcon {
	return categoryIconOptions.find((option) => option.id === id)?.icon ?? MoreHorizontal;
}
