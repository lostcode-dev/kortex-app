import { clearAuthCookies } from '../../utils/auth-cookies'
import { clearAuthUserCookie } from '../../utils/auth-user'

export default eventHandler(async (event) => {
  clearAuthCookies(event)
  clearAuthUserCookie(event)
  return { ok: true }
})
