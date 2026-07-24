import Foundation

/// Sandbox-only constants, mirroring src/lib/coinflow.ts on the web side.
/// No prod URL anywhere in here, on purpose.
enum Coinflow {
    static let merchantId = "predictionmarketmoon"
    static let hostedBase = "https://sandbox.coinflow.cash"
    static let callbackURLScheme = "bankauthdemo"
    static let callbackURL = "bankauthdemo://callback"

    /// This app's own backend (the Next.js API routes that hold the merchant
    /// API key) — hardcoded rather than user-editable, since there's one
    /// canonical deployment.
    static let apiBaseURL = "https://bank-auth.vercel.app"

    /// Hard safety cap for this demo app: never pay out more than $3.00.
    static let maxPayoutCents = 300

    /// A brand-new identity every app launch — matches the web app's
    /// behavior. Nothing is persisted, so force-quitting and reopening the
    /// app never brings a previous customerId back.
    static func generateCustomerId() -> String {
        "bank-auth-demo-\(UUID().uuidString)"
    }

    static func bankAuthURL(sessionKey: String) -> URL {
        var components = URLComponents(
            string: "\(hostedBase)/solana/withdraw/\(merchantId)"
        )!
        components.queryItems = [
            URLQueryItem(name: "sessionKey", value: sessionKey),
            URLQueryItem(name: "bankAccountLinkRedirect", value: callbackURL),
            URLQueryItem(name: "allowedWithdrawSpeeds", value: "standard"),
        ]
        return components.url!
    }
}
