import * as forge from 'node-forge';
import { readFileSync } from 'fs';
import { getLogger } from '../utils/logger';

export interface DecryptedPfx {
  cert: string;
  key?: string;
  ca?: string;
}

export interface PfxDecryptResult {
  success: boolean;
  data?: DecryptedPfx;
  error?: string;
}

export class PfxService {
  private logger = getLogger();

  async decryptPfx(pfxFilePath: string, password: string): Promise<PfxDecryptResult> {
    this.logger.info(`Decrypting PFX file: ${pfxFilePath}`);

    try {
      const pfxBuffer = readFileSync(pfxFilePath);
      const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);

      let p12: forge.pkcs12.Pkcs12Pfx;
      try {
        p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
      } catch (passwordError) {
        this.logger.error('Invalid PFX password');
        return {
          success: false,
          error: 'Invalid password',
        };
      }

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const caBags = p12.getBags({ bagType: forge.pki.oids.certBag });

      let certPem: string | undefined;
      let keyPem: string | undefined;
      let caPem: string | undefined;

      const certBag = certBags[forge.pki.oids.certBag];
      if (certBag && certBag[0] && certBag[0].cert) {
        certPem = forge.pki.certificateToPem(certBag[0].cert);
      }

      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (keyBag && keyBag[0] && keyBag[0].key) {
        keyPem = forge.pki.privateKeyToPem(keyBag[0].key);
      }

      const caBag = caBags[forge.pki.oids.certBag];
      if (caBag && caBag.length > 0) {
        const caCerts: string[] = [];
        for (const bag of caBag) {
          if (bag.cert) {
            caCerts.push(forge.pki.certificateToPem(bag.cert));
          }
        }
        if (caCerts.length > 0) {
          caPem = caCerts.join('');
        }
      }

      if (!certPem) {
        this.logger.error('No certificate found in PFX');
        return {
          success: false,
          error: 'No certificate found in PFX file',
        };
      }

      this.logger.info('PFX decrypted successfully');

      return {
        success: true,
        data: {
          cert: certPem,
          key: keyPem,
          ca: caPem,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to decrypt PFX: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export const pfxService = new PfxService();
