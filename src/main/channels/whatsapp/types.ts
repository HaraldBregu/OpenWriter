export interface WhatsAppAdapterOptions {
  /** directory to persist multi-file auth state (creds + signal keys) */
  auth_dir: string;
  /** E.164 phone number without `+` (digits only). Required for pairing-code login. */
  phone_number: string;
}
