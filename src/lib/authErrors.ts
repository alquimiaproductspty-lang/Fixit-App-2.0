/**
 * FIXIT Authentication Error Mapping & Logging
 * 
 * Maps Firebase Auth errors into friendly, professional user messages
 * while preserving full technical details in the browser console.
 * Strictly prevents technical jargon (OAuth, Firebase, provider, Google Cloud)
 * from being exposed to the end user.
 */

export function mapAuthErrorToFriendlyMessage(error: unknown): string {
  // Log authentication note to console for debugging
  console.warn('[FIXIT Auth]:', error);

  if (!error) {
    return 'Ocurrió un error inesperado. Por favor intenta nuevamente.';
  }

  const errString = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code || '';

  // 1. Popup bloqueado por el navegador
  if (
    errCode === 'auth/popup-blocked' || 
    errString.includes('auth/popup-blocked') ||
    errString.includes('popup-blocked') ||
    errString.includes('popup blocked')
  ) {
    return 'La ventana emergente fue bloqueada por tu navegador. Permite las ventanas emergentes para continuar con Google.';
  }

  // 2. Popup cerrado por el usuario
  if (
    errCode === 'auth/popup-closed-by-user' || 
    errString.includes('auth/popup-closed-by-user') ||
    errString.includes('cancelled-popup-request')
  ) {
    return 'Se cerró la ventana de inicio de sesión con Google antes de completar la verificación. Intenta nuevamente.';
  }

  // 3. Dominio no autorizado en Firebase Auth
  if (
    errCode === 'auth/unauthorized-domain' ||
    errString.includes('auth/unauthorized-domain') ||
    errString.includes('unauthorized domain')
  ) {
    return 'El acceso con Google no pudo completarse debido a restricciones de dominio. Puedes continuar con correo y contraseña.';
  }

  // 4. Missing initial state / Storage partitioning / SessionStorage inaccesible en Safari o PWA
  if (
    errCode === 'auth/missing-initial-state' ||
    errString.includes('missing initial state') ||
    errString.includes('missing-initial-state') ||
    errString.includes('storage-partitioned') ||
    errString.includes('sessionStorage is inaccessible') ||
    errString.includes('sessionStorage')
  ) {
    return 'El acceso con Google no pudo completarse. Puedes continuar con correo y contraseña.';
  }

  // 5. Método de autenticación no habilitado en Firebase Console (operation-not-allowed)
  if (
    errCode === 'auth/operation-not-allowed' ||
    errString.includes('operation-not-allowed')
  ) {
    return 'El inicio de sesión con correo y contraseña no está habilitado en este proyecto de Firebase. Por favor utiliza el botón "Continuar con Google".';
  }

  // 6. Configuración de Google OAuth / Provider no habilitado o restringido (403 restricted_client)
  if (
    errCode === 'auth/configuration-not-found' ||
    errString.includes('not yet configured to make OAuth requests') ||
    errString.includes('restricted_client') ||
    errString.includes('403') ||
    errString.includes('CONFIGURATION_NOT_FOUND') ||
    errString.includes('unauthorized_client') ||
    errString.includes('access_denied')
  ) {
    return 'El acceso con Google no pudo completarse. Por favor intenta nuevamente o contacta a soporte.';
  }

  // 6. Cuenta existente con credencial diferente
  if (
    errCode === 'auth/account-exists-with-different-credential' ||
    errString.includes('auth/account-exists-with-different-credential')
  ) {
    return 'Ya existe una cuenta registrada con este correo mediante otro método. Ingresa con tu correo y contraseña.';
  }

  // 7. Correo ya registrado
  if (errCode === 'auth/email-already-in-use' || errString.includes('auth/email-already-in-use')) {
    return 'Este correo electrónico ya está registrado. Por favor inicia sesión o recupera tu contraseña.';
  }

  // 8. Credenciales incorrectas o usuario no encontrado
  if (
    errCode === 'auth/wrong-password' ||
    errCode === 'auth/invalid-credential' ||
    errCode === 'auth/user-not-found' ||
    errString.includes('auth/wrong-password') ||
    errString.includes('auth/invalid-credential') ||
    errString.includes('auth/user-not-found')
  ) {
    return 'Correo electrónico o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
  }

  // 9. Usuario deshabilitado
  if (errCode === 'auth/user-disabled' || errString.includes('auth/user-disabled')) {
    return 'Esta cuenta ha sido deshabilitada. Por favor contacta al equipo de atención de FIXIT.';
  }

  // 10. Formato de correo inválido
  if (errCode === 'auth/invalid-email' || errString.includes('auth/invalid-email')) {
    return 'El formato del correo electrónico no es válido. Ej: usuario@correo.com';
  }

  // 11. Contraseña débil
  if (errCode === 'auth/weak-password' || errString.includes('auth/weak-password')) {
    return 'La contraseña es demasiado corta. Debe tener al menos 6 caracteres.';
  }

  // 12. Error de red
  if (errCode === 'auth/network-request-failed' || errString.includes('auth/network-request-failed')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión a internet e intenta nuevamente.';
  }

  // 13. Sesión expirada
  if (errCode === 'auth/requires-recent-login' || errString.includes('auth/requires-recent-login')) {
    return 'Tu sesión ha expirado por seguridad. Por favor vuelve a iniciar sesión.';
  }

  // Fallback específico para cualquier otro error relacionado a Google OAuth o Popup
  if (errString.toLowerCase().includes('google') || errString.toLowerCase().includes('popup')) {
    return 'El acceso con Google no pudo completarse. Puedes continuar con correo y contraseña.';
  }

  // Default fallback
  return 'No pudimos completar la operación. Por favor verifica tus datos e intenta nuevamente.';
}
