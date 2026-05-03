export interface WhatsAppAdapterOptions {
  /** directory to persist multi-file auth state (creds + signal keys) */
  auth_dir: string;
  /** allowed sender JIDs (e.g. "123456789@s.whatsapp.net"); empty = allow all */
  allow_from: string[];
}
