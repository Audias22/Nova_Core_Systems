export const formatFecha = (fecha) => {
  if (!fecha) return '—'
  // Si es solo fecha (YYYY-MM-DD), agregar T12:00:00 para evitar el problema de timezone
  const fechaNormalizada = typeof fecha === 'string' && fecha.length === 10
    ? fecha + 'T12:00:00'
    : fecha
  const d = new Date(fechaNormalizada)
  if (isNaN(d.getTime())) return fecha
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Guatemala'
  })
}