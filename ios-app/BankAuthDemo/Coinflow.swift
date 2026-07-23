import Foundation

/// Sandbox-only constants, mirroring src/lib/coinflow.ts on the web side.
/// No prod URL anywhere in here, on purpose.
enum Coinflow {
    static let merchantId = "predictionmarketmoon"
    static let hostedBase = "https://sandbox.coinflow.cash"
    static let callbackURLScheme = "bankauthdemo"
    static let callbackURL = "bankauthdemo://callback"

    /// Hard safety cap for this demo app: never pay out more than $3.00.
    static let maxPayoutCents = 300

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
