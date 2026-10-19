// The Android app's own contact, also used on its Google Play listing (not the Rabisco one).
export const KIDS_CONTACT_EMAIL = 'francaconnectapps@gmail.com'

export function KidsContact() {
  return <a href={`mailto:${KIDS_CONTACT_EMAIL}`}>{KIDS_CONTACT_EMAIL}</a>
}
