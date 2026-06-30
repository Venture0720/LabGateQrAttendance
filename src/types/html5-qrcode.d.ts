export declare module "html5-qrcode" {
  class Html5QrcodeScanner {
    constructor(
      qrElement: string | HTMLElement,
      config: unknown,
      verbose?: boolean
    );
    render(
      onScanSuccess: (decodedText: string, result: unknown) => void,
      onScanFailure?: (error: string) => void
    ): Promise<void>;
    clear(): Promise<void>;
  }
}
