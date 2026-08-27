/** Formato español: punto de millar, coma decimal (ej. 1.234,5). */
export function formatearNumero(valor, decimales = 0) {
	return valor.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}
