import { QRCodeSVG } from 'qrcode.react';
import logoPath from '@assets/IMG_8913_1760655687615.jpeg';

export default function QRCodePage() {
  const baseUrl = window.location.origin.replace('qr.', '');
  const qrLandingUrl = baseUrl + '/qr-landing';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">ForeScore</h1>
            <p className="text-gray-600">Golf Payout Calculator</p>
          </div>

          <div className="bg-white p-6 rounded-xl border-4 border-emerald-500 flex justify-center">
            <div className="relative">
              <QRCodeSVG
                value={qrLandingUrl}
                size={256}
                level="H"
                fgColor="#0A9961"
                bgColor="#FFFFFF"
                imageSettings={{
                  src: logoPath,
                  height: 50,
                  width: 50,
                  excavate: true,
                }}
              />
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-gray-900">
                Scan to Learn About ForeScore
              </p>
              <p className="text-sm text-gray-500">
                Make your golf game more competitive
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <a 
                href={qrLandingUrl}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                data-testid="link-app"
              >
                Or visit: {baseUrl}/qr-landing
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © 2025 ForeScore. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
