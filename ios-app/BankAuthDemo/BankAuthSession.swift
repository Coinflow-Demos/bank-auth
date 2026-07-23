import AuthenticationServices
import UIKit

/// Opens Coinflow's hosted bank-auth URL in the system browser (Safari's
/// view controller under the hood) rather than an embedded webview. This is
/// the fix for OAuth banks: the session shares Safari's real cookies, and
/// the callback URL scheme below is how control comes back to the app.
@MainActor
final class BankAuthSession: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func start(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: Coinflow.callbackURLScheme
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            // Share Safari's cookies/session — this is what lets OAuth bank
            // logins that already have an active session succeed.
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first
        return scene?.windows.first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
