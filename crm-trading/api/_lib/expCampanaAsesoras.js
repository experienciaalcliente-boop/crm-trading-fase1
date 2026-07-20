// Mapa de asesora_id -> wa.link del Plan Exalumnos, según variante de
// correo (Aula Virtual = Correo 0, Impulso = Correo 1). A diferencia de
// Plan Reactivate Burs (un solo wa_link para toda la campaña), acá cada
// exalumno tiene una asesora asignada y el botón de WhatsApp del correo
// debe llevar a ESA persona, no a un número genérico.
export const WA_LINKS = {
  aula: {
    'cfb154c2-f598-4bfb-8f2b-809d26f8fe83': 'https://wa.link/mpxc5f', // Anael Silva
    'e5653c76-5e98-4752-9c54-cd757b8452f5': 'https://wa.link/we4wli', // Fabiola Malpartida
    'f7676411-95e5-43ca-afcd-a50230022411': 'https://wa.link/k2z3jt', // Katerin Flores
    '6611cffb-f8ca-48cc-b869-3092655f901a': 'https://wa.link/wei84w', // Alexandro Sabana
  },
  impulso: {
    'cfb154c2-f598-4bfb-8f2b-809d26f8fe83': 'https://wa.link/f87dhk',
    'e5653c76-5e98-4752-9c54-cd757b8452f5': 'https://wa.link/8y3mm1',
    'f7676411-95e5-43ca-afcd-a50230022411': 'https://wa.link/nwwiks',
    '6611cffb-f8ca-48cc-b869-3092655f901a': 'https://wa.link/pwa7ii',
  },
}

export function waLinkPara(asesoraId, variante) {
  return WA_LINKS[variante]?.[asesoraId] || Object.values(WA_LINKS.aula)[0]
}
