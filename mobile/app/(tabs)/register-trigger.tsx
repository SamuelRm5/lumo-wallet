import { Redirect } from "expo-router";

// Nunca se ve: el layout de pestañas intercepta el toque sobre esta pestaña y abre
// /register-operation como modal en su lugar. Este archivo solo existe porque
// expo-router necesita una ruta para poder registrar el ícono central del tab bar.
export default function RegisterTrigger() {
	return <Redirect href="/" />;
}
