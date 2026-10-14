// The Pix key that receives support. It is a random key (not a CPF, e-mail or phone), so it is safe to publish.
export const PIX_KEY = '79085a1e-1f8e-45a8-9de5-880200149c96'
export const PIX_NAME = 'Rabisco'
export const PIX_CITY = 'BRASIL'

/** One EMV field: id, two-digit length, value. */
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

/** CRC-16/CCITT-FALSE (polynomial 0x1021, start 0xFFFF), as the BR Code requires. */
export function crc16(text: string): string {
  let crc = 0xffff
  for (let index = 0; index < text.length; index++) {
    crc ^= text.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** A static Pix BR Code ("copia e cola"), with no amount: the person types how much to send. */
export function pixPayload(key: string = PIX_KEY, name: string = PIX_NAME, city: string = PIX_CITY): string {
  const body =
    field('00', '01') +
    field('01', '11') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') +
    field('58', 'BR') +
    field('59', name.slice(0, 25)) +
    field('60', city.slice(0, 15)) +
    field('62', field('05', '***')) +
    '6304'
  return body + crc16(body)
}
