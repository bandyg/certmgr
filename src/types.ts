export type CertificateType = 'client' | 'server' | 'ca';

export interface CertificateMetadata {
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  subject?: string;
  issuer?: string;
}

export interface Certificate {
  id: string;
  name: string;
  type: CertificateType;
  cert: string;
  key?: string;
  ca?: string;
  metadata: CertificateMetadata;
}

export interface CreateCertificateDTO {
  name: string;
  type: CertificateType;
  cert: string;
  key?: string;
  ca?: string;
  expiresAt?: string;
  subject?: string;
  issuer?: string;
}

export interface UpdateCertificateDTO {
  name?: string;
  cert?: string;
  key?: string;
  ca?: string;
  expiresAt?: string;
  subject?: string;
  issuer?: string;
}

export interface CertificateListItem {
  id: string;
  name: string;
  type: CertificateType;
  metadata: CertificateMetadata;
  hasKey: boolean;
  hasCa: boolean;
}
