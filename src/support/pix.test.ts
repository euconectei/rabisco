import { PIX_KEY, crc16, pixPayload } from './pix'

it('computes the CRC-16/CCITT-FALSE check value (the standard "123456789" vector)', () => {
  expect(crc16('123456789')).toBe('29B1')
})

it('builds a static BR Code with the key, no amount, and a valid checksum', () => {
  const payload = pixPayload()
  expect(payload.startsWith('000201010211')).toBe(true)
  expect(payload).toContain('0014br.gov.bcb.pix')
  expect(payload).toContain(`0136${PIX_KEY}`)
  expect(payload).toContain('5303986')
  expect(payload).toContain('5802BR')
  expect(payload).toContain('5907Rabisco')
  expect(payload).not.toContain('54') // there is no amount field
  expect(payload.slice(-8, -4)).toBe('6304')
  expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)))
})

it('keeps every field length consistent', () => {
  const payload = pixPayload('chave-de-teste', 'Nome Muito Longo Para O Campo Do Pix Aqui', 'Cidade Com Nome Longo')
  expect(payload).toContain('5925Nome Muito Longo Para O C') // 25 characters at most
  expect(payload).toContain('6015Cidade Com Nome') // 15 characters at most
})
